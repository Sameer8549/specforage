"""Coverage, review routing, and honest ground-truth evaluation helpers."""

import re
from dataclasses import dataclass
from typing import Iterable, Mapping

from specforge.contracts import ItemRecord, ReviewFlag
from specforge.normalization import canonicalize_uom


DESCRIPTION_FIELD_MAP = {
    "MOBILE_DESC": "mobile_desc",
    "INVOICE_DESC": "invoice_desc",
    "SHORT_DESC": "short_desc",
    "LONG_DESC1": "long_desc1",
    "RETAIL_DESC": "retail_desc",
    "MARKETING_DESCRIPTION": "marketing_description",
}
_ATTRIBUTE_LABEL = re.compile(r"^ATTRIBUTE_LABEL (\d+)$")
_TRADEMARKS = str.maketrans("", "", "®™")


def comparison_text(value: str | None, *, remove_trademarks: bool = False) -> str:
    if value is None:
        return ""
    text = value.translate(_TRADEMARKS) if remove_trademarks else value
    return " ".join(text.casefold().split())


def ground_truth_attributes(row: Mapping[str, str]) -> dict[str, tuple[str, str | None]]:
    result: dict[str, tuple[str, str | None]] = {}
    for key, label in row.items():
        match = _ATTRIBUTE_LABEL.match(key)
        if not match or not label.strip():
            continue
        index = match.group(1)
        value = row.get(f"ATTRIBUTE_VALUE {index}", "").strip()
        uom = row.get(f"ATTRIBUTE_UOM {index}", "").strip() or None
        if value:
            result[label.strip()] = (value, canonicalize_uom(uom) if uom else None)
    return result


@dataclass(frozen=True, slots=True)
class AccuracyCounts:
    correct: int = 0
    compared: int = 0

    @property
    def percent(self) -> float:
        return round(100 * self.correct / self.compared, 2) if self.compared else 0.0


def evaluate_against_ground_truth(
    record: ItemRecord, row: Mapping[str, str]
) -> tuple[dict[str, float], list[str]]:
    counts: dict[str, AccuracyCounts] = {}
    resolution = record.brand_resolution

    def scalar(name: str, actual: str | None, expected: str, remove_trademarks: bool = False) -> None:
        if not expected.strip():
            return
        correct = comparison_text(actual, remove_trademarks=remove_trademarks) == comparison_text(
            expected, remove_trademarks=remove_trademarks
        )
        counts[name] = AccuracyCounts(int(correct), 1)

    scalar(
        "manufacturer",
        resolution.manufacturer.canonical_name if resolution else None,
        row.get("MANUFACTURER_NAME", ""),
    )
    scalar(
        "brand",
        resolution.brand.canonical_name if resolution else None,
        row.get("BRAND_NAME", ""),
        remove_trademarks=True,
    )
    scalar(
        "classpath",
        record.classify.classpath if record.classify else None,
        row.get("Classpath", ""),
    )

    actual_attributes = {
        attribute.label: (attribute.value or "", attribute.uom)
        for attribute in (record.adjudicate.attributes if record.adjudicate else [])
    }
    attribute_correct = 0
    expected_attributes = ground_truth_attributes(row)
    for label, (expected_value, expected_uom) in expected_attributes.items():
        actual_value, actual_uom = actual_attributes.get(label, ("", None))
        if (
            comparison_text(actual_value) == comparison_text(expected_value)
            and actual_uom == expected_uom
        ):
            attribute_correct += 1
    counts["attributes"] = AccuracyCounts(attribute_correct, len(expected_attributes))

    description_correct = 0
    description_compared = 0
    for delivery_field, contract_field in DESCRIPTION_FIELD_MAP.items():
        expected = row.get(delivery_field, "")
        if not expected.strip():
            continue
        description_compared += 1
        actual = getattr(record.description, contract_field) if record.description else None
        if comparison_text(actual) == comparison_text(expected):
            description_correct += 1
    counts["descriptions"] = AccuracyCounts(description_correct, description_compared)

    total_correct = sum(value.correct for value in counts.values())
    total_compared = sum(value.compared for value in counts.values())
    accuracy = {name: value.percent for name, value in counts.items()}
    accuracy["overall"] = AccuracyCounts(total_correct, total_compared).percent

    gaps: list[str] = []
    for field in ("UNSPSC", "Country Of Origin"):
        if not row.get(field, "").strip():
            gaps.append(f"Ground truth leaves {field} blank; excluded from accuracy denominator.")
    for name in ("manufacturer", "brand", "classpath"):
        result = counts.get(name)
        if result is not None and result.compared and not result.correct:
            gaps.append(f"{name.title()} differs from the populated ground-truth value.")
    return accuracy, gaps


def aggregate_accuracy(audits: Iterable[dict[str, float]]) -> dict[str, float]:
    rows = list(audits)
    keys = sorted({key for row in rows for key in row})
    return {
        key: round(sum(row[key] for row in rows if key in row) / sum(key in row for row in rows), 2)
        for key in keys
        if any(key in row for row in rows)
    }


def make_unresolved_flag(field: str, message: str) -> ReviewFlag:
    return ReviewFlag(
        code="audit_unresolved",
        message=message,
        field=field,
        stage="audit",
    )
