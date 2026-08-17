"""Memory-conscious CSV discovery, schema validation, and streaming access."""

import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator, Mapping

from specforge.config import Settings
from specforge.contracts import InputStage, ItemRecord
from specforge.reference_data import (
    DeliverySchema,
    ReferenceArtifact,
    artifact,
    require_strict_artifacts,
)


WORKING_HEADERS = (
    "Mfg_Part_Num",
    "Part_Desc",
    "E1_Brand",
    "Unilog_Brand",
    "DIB_Brand",
    "Part_Manuf",
)


class DatasetValidationError(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class DatasetInfo:
    path: Path
    row_count: int
    headers: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class DatasetCatalog:
    working: DatasetInfo
    ground_truth: DatasetInfo
    delivery_schema: DeliverySchema
    reference_artifacts: tuple[ReferenceArtifact, ...]


def inspect_csv(path: Path) -> DatasetInfo:
    if not path.is_file():
        raise DatasetValidationError(f"Dataset not found: {path}")
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.reader(handle)
        try:
            headers = tuple(next(reader))
        except StopIteration as exc:
            raise DatasetValidationError(f"Dataset is empty: {path}") from exc
        row_count = sum(1 for row in reader if any(cell.strip() for cell in row))
    return DatasetInfo(path=path, row_count=row_count, headers=headers)


def load_catalog(settings: Settings) -> DatasetCatalog:
    working = inspect_csv(settings.resolve_data_path(settings.working_dataset))
    ground_truth = inspect_csv(settings.resolve_data_path(settings.ground_truth_dataset))
    if working.headers != WORKING_HEADERS:
        raise DatasetValidationError(
            f"Working dataset headers must exactly match {WORKING_HEADERS}; got {working.headers}"
        )
    if working.row_count != settings.expected_working_rows:
        raise DatasetValidationError(
            f"Working dataset expected {settings.expected_working_rows} rows; got {working.row_count}"
        )
    if ground_truth.row_count != settings.expected_ground_truth_rows:
        raise DatasetValidationError(
            f"Ground truth expected {settings.expected_ground_truth_rows} rows; got {ground_truth.row_count}"
        )
    if settings.expected_delivery_columns != 252:
        raise DatasetValidationError("SpecForge supports the official 252-column Delivery Format only.")
    try:
        delivery_schema = DeliverySchema.validate(
            ground_truth.headers,
            ground_truth.path,
            settings.expected_delivery_header_sha256,
        )
        references = (
            artifact("delivery_format", ground_truth.path, "supplied_ground_truth_header", required=True),
            artifact(
                "official_unicat",
                settings.resolve_data_path(settings.official_unicat_dataset)
                if settings.official_unicat_dataset else None,
                "official_unicat",
                required=True,
            ),
            artifact(
                "official_lov",
                settings.resolve_data_path(settings.official_lov_dataset)
                if settings.official_lov_dataset else None,
                "official_lov",
                required=True,
            ),
            artifact(
                "self_derived_entities",
                settings.resolve_data_path(Path("data/artifacts/manufacturer_brand_vocabulary.json")),
                "self_derived_from_supplied_csv",
                required=False,
            ),
            artifact(
                "self_derived_attributes",
                settings.resolve_data_path(Path("data/artifacts/attribute_vocabulary.json")),
                "self_derived_from_supplied_csv",
                required=False,
            ),
        )
        if settings.require_official_reference_data:
            require_strict_artifacts(references)
    except RuntimeError as exc:
        raise DatasetValidationError(str(exc)) from exc
    return DatasetCatalog(
        working=working,
        ground_truth=ground_truth,
        delivery_schema=delivery_schema,
        reference_artifacts=references,
    )


def iter_csv_rows(info: DatasetInfo) -> Iterator[dict[str, str]]:
    with info.path.open("r", encoding="utf-8-sig", newline="") as handle:
        yield from csv.DictReader(handle)


def item_record_from_row(row: Mapping[str, str], row_number: int) -> ItemRecord:
    return ItemRecord(
        input=InputStage(
            mfg_part_num=row["Mfg_Part_Num"],
            part_desc=row["Part_Desc"],
            e1_brand=row.get("E1_Brand"),
            unilog_brand=row.get("Unilog_Brand"),
            dib_brand=row.get("DIB_Brand"),
            part_manuf=row.get("Part_Manuf"),
            source_row_number=row_number,
        )
    )
