"""Versioned reference-data contracts and strict Delivery Format validation."""

import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import Path


DELIVERY_COLUMN_COUNT = 252
REQUIRED_DELIVERY_FIELDS = frozenset(
    {
        "Mfg_Part_Num",
        "Part_Desc",
        "MANUFACTURER_PART_NUMBER",
        "MANUFACTURER_NAME",
        "BRAND_NAME",
        "Classpath",
        "UNSPSC",
        "MOBILE_DESC",
        "INVOICE_DESC",
        "SHORT_DESC",
        "LONG_DESC1",
        "RETAIL_DESC",
    }
)
_ATTRIBUTE_COLUMN = re.compile(r"^ATTRIBUTE_(LABEL|VALUE|UOM) (\d+)$")


class ReferenceDataError(RuntimeError):
    """Raised when a required reference artifact is absent or incompatible."""


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def header_sha256(headers: tuple[str, ...]) -> str:
    payload = json.dumps(headers, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


@dataclass(frozen=True, slots=True)
class DeliverySchema:
    headers: tuple[str, ...]
    sha256: str
    source_path: Path

    @classmethod
    def validate(
        cls,
        headers: tuple[str, ...],
        source_path: Path,
        expected_sha256: str | None = None,
    ) -> "DeliverySchema":
        if len(headers) != DELIVERY_COLUMN_COUNT:
            raise ReferenceDataError(
                f"Delivery Format must contain exactly {DELIVERY_COLUMN_COUNT} columns; "
                f"got {len(headers)} from {source_path}."
            )
        if len(set(headers)) != len(headers):
            raise ReferenceDataError("Delivery Format contains duplicate column headers.")
        missing = REQUIRED_DELIVERY_FIELDS - set(headers)
        if missing:
            raise ReferenceDataError(
                f"Delivery Format is missing required fields: {sorted(missing)}"
            )
        slots: dict[int, set[str]] = {}
        for header in headers:
            if match := _ATTRIBUTE_COLUMN.match(header):
                slots.setdefault(int(match.group(2)), set()).add(match.group(1))
        incomplete = {slot: sorted({"LABEL", "VALUE", "UOM"} - members) for slot, members in slots.items() if members != {"LABEL", "VALUE", "UOM"}}
        if incomplete:
            raise ReferenceDataError(f"Delivery Format has incomplete attribute slots: {incomplete}")
        digest = header_sha256(headers)
        if expected_sha256 and digest != expected_sha256:
            raise ReferenceDataError(
                "Delivery Format header order/version does not match the configured schema hash: "
                f"expected {expected_sha256}, got {digest}."
            )
        return cls(headers=headers, sha256=digest, source_path=source_path)


@dataclass(frozen=True, slots=True)
class ReferenceArtifact:
    name: str
    path: Path | None
    origin: str
    required_for_strict_mode: bool
    sha256: str | None

    @property
    def available(self) -> bool:
        return self.path is not None and self.path.is_file()


def artifact(name: str, path: Path | None, origin: str, *, required: bool) -> ReferenceArtifact:
    available_path = path if path is not None and path.is_file() else None
    return ReferenceArtifact(
        name=name,
        path=available_path,
        origin=origin,
        required_for_strict_mode=required,
        sha256=sha256_file(available_path) if available_path else None,
    )


def require_strict_artifacts(artifacts: tuple[ReferenceArtifact, ...]) -> None:
    missing = [item.name for item in artifacts if item.required_for_strict_mode and not item.available]
    if missing:
        raise ReferenceDataError(
            "Strict submission mode requires official reference artifacts that are not present: "
            + ", ".join(missing)
        )
