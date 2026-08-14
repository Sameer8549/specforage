"""Deterministic input cleanup. This stage never invents or enriches values."""

import re
import unicodedata
from datetime import datetime, timezone

from specforge.contracts import CleanStage, ItemRecord


_WHITESPACE = re.compile(r"\s+")
_CONTROL_CHARACTERS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_DASHES = str.maketrans({"‐": "-", "‑": "-", "‒": "-", "–": "-", "—": "-", "−": "-"})
_PLACEHOLDER_TOKENS = frozenset(
    {
        "",
        "-",
        "--",
        "n/a",
        "na",
        "none",
        "null",
        "not available",
        "unknown",
        "unbranded",
        "no brand",
        "no manufacturer",
        "no manuf",
        "no unilog brand",
        "no dib brand",
        "commodity - unbranded",
    }
)


def clean_text(value: str | None) -> str | None:
    """Normalize Unicode, dashes, controls, and whitespace without changing meaning."""

    if value is None:
        return None
    normalized = unicodedata.normalize("NFKC", value).translate(_DASHES)
    normalized = _CONTROL_CHARACTERS.sub("", normalized)
    normalized = _WHITESPACE.sub(" ", normalized).strip()
    return normalized or None


def is_placeholder(value: str | None) -> bool:
    cleaned = clean_text(value)
    if cleaned is None:
        return True
    token = cleaned.casefold().strip(" -_.,:;")
    return token in _PLACEHOLDER_TOKENS


def clean_optional(value: str | None) -> str | None:
    cleaned = clean_text(value)
    return None if is_placeholder(cleaned) else cleaned


def run_clean_stage(record: ItemRecord) -> ItemRecord:
    """Return a new record with only the clean namespace appended."""

    source = record.input
    raw_values = {
        "mfg_part_num": source.mfg_part_num,
        "part_desc": source.part_desc,
        "e1_brand": source.e1_brand,
        "unilog_brand": source.unilog_brand,
        "dib_brand": source.dib_brand,
        "part_manuf": source.part_manuf,
    }
    cleaned_values = {field: clean_optional(value) for field, value in raw_values.items()}
    nullified_fields = [
        field
        for field, raw_value in raw_values.items()
        if raw_value is not None and is_placeholder(raw_value)
    ]
    return record.model_copy(
        update={
            "clean": CleanStage(**cleaned_values, nullified_fields=nullified_fields),
            "updated_at": datetime.now(timezone.utc),
        },
        deep=True,
    )
