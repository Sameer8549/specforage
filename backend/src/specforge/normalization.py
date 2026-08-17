"""Universal UOM handling, fractional dimensions, and self-growing value vocabulary."""

import math
import re
import threading
import csv
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

from rapidfuzz import fuzz, process

from specforge.contracts import AttributeValue
from specforge.data import DatasetInfo, iter_csv_rows
from specforge.expected_attributes import category_similarity


UOM_ALIASES: dict[str, tuple[str, ...]] = {
    "V": ("v", "volt", "volts"),
    "A": ("a", "amp", "amps", "ampere", "amperes"),
    "in": ("in", "inch", "inches", '"'),
    "ft": ("ft", "foot", "feet", "'"),
    "lb": ("lb", "lbs", "pound", "pounds"),
    "W": ("w", "watt", "watts"),
    "Hz": ("hz", "hertz"),
    "dBA": ("dba",),
    "GPM": ("gpm", "gal/min", "gallons per minute"),
    "PSI": ("psi", "lb/in2", "lb/in²"),
    "°F": ("°f", "deg f", "degree f", "degrees f", "fahrenheit"),
    "°C": ("°c", "deg c", "degree c", "degrees c", "celsius"),
    "rpm": ("rpm", "rev/min"),
    "%": ("%", "percent"),
    "hr": ("hr", "hrs", "hour", "hours"),
    "kW-hr": ("kw-hr", "kwh", "kilowatt-hour", "kilowatt-hours"),
}

_ALIAS_TO_UOM = {
    alias.casefold(): canonical
    for canonical, aliases in UOM_ALIASES.items()
    for alias in (canonical, *aliases)
}
_TRAILING_UOM = re.compile(
    r"^(?P<value>.*\d)\s*(?P<uom>gallons per minute|kilowatt-hours?|degrees? [fc]|"
    r"fahrenheit|celsius|amperes?|volts?|watts?|hertz|pounds?|inches|inch|feet|foot|"
    r"gal/min|lb/in[2²]|deg [fc]|kw-hr|kwh|rev/min|dba|gpm|psi|rpm|percent|hrs?|hours?|"
    r"[vaiw]|in|ft|lb|hz|°[fc]|%|[\"'])$",
    re.IGNORECASE,
)
_DECIMAL_NUMBER = re.compile(r"(?<![\w./-])(-?\d+\.\d+)(?![\w.])")
_VALUE_KEY = re.compile(r"[^a-z0-9]+")
_ATTRIBUTE_LABEL = re.compile(r"^ATTRIBUTE_LABEL (\d+)$")


def canonicalize_uom(value: str | None) -> str | None:
    if value is None or not value.strip():
        return None
    return _ALIAS_TO_UOM.get(re.sub(r"\s+", " ", value.strip()).casefold())


def split_value_and_uom(value: str, explicit_uom: str | None) -> tuple[str, str | None, bool]:
    text = re.sub(r"\s+", " ", value).strip()
    canonical_explicit = canonicalize_uom(explicit_uom)
    if explicit_uom and canonical_explicit is None:
        return text, None, False
    match = _TRAILING_UOM.match(text)
    if match:
        suffix_uom = canonicalize_uom(match.group("uom"))
        if canonical_explicit is not None and suffix_uom != canonical_explicit:
            return text, None, False
        return match.group("value").strip(), suffix_uom, True
    return text, canonical_explicit, True


def decimal_to_fraction(value: Decimal, denominator: int = 64) -> str:
    scaled = int((value.copy_abs() * denominator).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    whole, numerator = divmod(scaled, denominator)
    if numerator:
        divisor = math.gcd(numerator, denominator)
        fraction = f"{numerator // divisor}/{denominator // divisor}"
        result = f"{whole}-{fraction}" if whole else fraction
    else:
        result = str(whole)
    return f"-{result}" if value < 0 else result


def decimal_text_to_fraction(text: str) -> str:
    return _DECIMAL_NUMBER.sub(lambda match: decimal_to_fraction(Decimal(match.group(1))), text)


def format_measurement(value: str, uom: str | None) -> str:
    return f"{value} {uom}" if uom else value


def _comparison_key(value: str) -> str:
    return " ".join(_VALUE_KEY.sub(" ", value.casefold()).split())


def normalize_candidate(candidate: AttributeValue) -> tuple[str, str | None, bool]:
    if candidate.value is None:
        return "", None, False
    value, uom, valid_uom = split_value_and_uom(candidate.value, candidate.uom)
    dimensional_label = any(
        token in candidate.label.casefold()
        for token in ("size", "length", "width", "height", "depth", "diameter", "thickness")
    )
    if uom in {"in", "ft"} or dimensional_label:
        value = decimal_text_to_fraction(value)
    return value, uom, valid_uom


@dataclass(frozen=True, slots=True)
class CanonicalAttributeValue:
    value: str
    uom: str | None


class AttributeVocabulary:
    """First-seen canonical buckets scoped to a ground-truth-compatible category."""

    def __init__(self) -> None:
        self._buckets: dict[tuple[str, str], list[CanonicalAttributeValue]] = {}
        self._closed: set[tuple[str, str]] = set()
        self._lock = threading.Lock()

    @classmethod
    def from_lov_csv(cls, path) -> "AttributeVocabulary":
        vocabulary = cls()
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            fields = {field.strip().casefold().replace(" ", "_"): field for field in (reader.fieldnames or [])}
            def required(*aliases: str) -> str:
                for alias in aliases:
                    if alias in fields:
                        return fields[alias]
                raise ValueError(f"Official LOV file is missing a required column; expected one of {aliases}.")
            path_column = required("classpath", "category_path", "category")
            label_column = required("attribute", "attribute_name", "label")
            value_column = required("value", "lov_value", "canonical_value")
            uom_column = next((fields[key] for key in ("uom", "unit", "unit_of_measure") if key in fields), None)
            for row in reader:
                classpath = (row.get(path_column) or "").strip()
                label = (row.get(label_column) or "").strip()
                raw_value = (row.get(value_column) or "").strip()
                raw_uom = (row.get(uom_column) or "").strip() if uom_column else ""
                if not classpath or not label:
                    continue
                key = (classpath, label)
                vocabulary._closed.add(key)
                if not raw_value:
                    continue
                candidate = AttributeValue(label=label, value=raw_value, uom=raw_uom or None)
                value, uom, valid = normalize_candidate(candidate)
                if not valid:
                    raise ValueError(f"Official LOV contains unsupported UOM {raw_uom!r} for {label!r}.")
                canonical = CanonicalAttributeValue(value=value, uom=uom)
                bucket = vocabulary._buckets.setdefault(key, [])
                if canonical not in bucket:
                    bucket.append(canonical)
        if not vocabulary._closed:
            raise ValueError("Official LOV file contains no usable classpath/attribute rows.")
        return vocabulary

    @classmethod
    def from_ground_truth(cls, info: DatasetInfo) -> "AttributeVocabulary":
        vocabulary = cls()
        label_columns = sorted(
            (int(match.group(1)), header)
            for header in info.headers
            if (match := _ATTRIBUTE_LABEL.match(header))
        )
        for row in iter_csv_rows(info):
            classpath = row.get("Classpath", "").strip()
            if not classpath:
                continue
            for index, label_column in label_columns:
                label = row.get(label_column, "").strip()
                if not label:
                    continue
                bucket = vocabulary._buckets.setdefault((classpath, label), [])
                raw_value = row.get(f"ATTRIBUTE_VALUE {index}", "").strip()
                raw_uom = row.get(f"ATTRIBUTE_UOM {index}", "").strip() or None
                if not raw_value:
                    continue
                candidate = AttributeValue(label=label, value=raw_value, uom=raw_uom)
                value, uom, valid = normalize_candidate(candidate)
                if valid and not any(item.value == value and item.uom == uom for item in bucket):
                    bucket.append(CanonicalAttributeValue(value=value, uom=uom))
        return vocabulary

    def _bucket_key(self, classpath: str, label: str) -> tuple[str, str]:
        exact = (classpath, label)
        if exact in self._buckets:
            return exact
        paths = sorted({path for path, existing_label in self._buckets if existing_label == label})
        match = process.extractOne(
            classpath,
            paths,
            scorer=lambda query, choice, **_: category_similarity(query, choice),
            score_cutoff=55,
        )
        return (match[0], label) if match is not None else exact

    def constrain(
        self,
        classpath: str,
        label: str,
        value: str,
        uom: str | None,
        threshold: float,
    ) -> CanonicalAttributeValue | None:
        if uom is not None:
            canonical_uom = canonicalize_uom(uom)
            if canonical_uom is None:
                return None
            uom = canonical_uom
        with self._lock:
            key = self._bucket_key(classpath, label)
            bucket = self._buckets.setdefault(key, [])
            if not bucket:
                if key in self._closed:
                    return None
                canonical = CanonicalAttributeValue(value=value, uom=uom)
                bucket.append(canonical)
                return canonical
            compatible = [candidate for candidate in bucket if candidate.uom == uom]
            if not compatible:
                return None
            query = _comparison_key(value)
            choices = [_comparison_key(candidate.value) for candidate in compatible]
            match = process.extractOne(query, choices, scorer=fuzz.WRatio)
            if match is None or match[1] / 100 < threshold:
                return None
            return compatible[match[2]]

    def values_for(self, classpath: str, label: str) -> tuple[CanonicalAttributeValue, ...]:
        key = self._bucket_key(classpath, label)
        return tuple(self._buckets.get(key, ()))
