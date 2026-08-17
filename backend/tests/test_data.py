from pathlib import Path

import pytest

from specforge.config import Settings, _default_data_root
from specforge.data import DatasetValidationError, WORKING_HEADERS, item_record_from_row, iter_csv_rows, load_catalog
from specforge.reference_data import DELIVERY_COLUMN_COUNT, DeliverySchema, ReferenceDataError


def test_supplied_datasets_load_and_validate() -> None:
    catalog = load_catalog(Settings())

    assert catalog.working.row_count == 1000
    assert catalog.working.headers == WORKING_HEADERS
    assert catalog.ground_truth.row_count == 2
    assert len(catalog.ground_truth.headers) == 252
    assert len(catalog.delivery_schema.headers) == DELIVERY_COLUMN_COUNT
    assert catalog.delivery_schema.sha256 == Settings().expected_delivery_header_sha256
    assert {item.name: item.available for item in catalog.reference_artifacts} == {
        "delivery_format": True,
        "official_unicat": False,
        "official_lov": False,
        "self_derived_entities": True,
        "self_derived_attributes": True,
    }


def test_working_row_maps_to_input_contract() -> None:
    catalog = load_catalog(Settings())
    first_row = next(iter_csv_rows(catalog.working))
    record = item_record_from_row(first_row, row_number=1)

    assert record.input.source_row_number == 1
    assert record.input.mfg_part_num == first_row["Mfg_Part_Num"]
    assert record.clean is None


def test_deployed_app_directory_is_used_as_data_root(tmp_path, monkeypatch) -> None:
    (tmp_path / "data").mkdir()
    monkeypatch.chdir(tmp_path)

    assert _default_data_root() == tmp_path
    assert Settings(_env_file=None).resolve_data_path(Path("data/items.csv")) == tmp_path / "data/items.csv"


def test_delivery_schema_rejects_wrong_count_and_wrong_version(tmp_path) -> None:
    with pytest.raises(ReferenceDataError, match="exactly 252"):
        DeliverySchema.validate(("A", "B"), tmp_path / "wrong.csv")
    headers = load_catalog(Settings()).ground_truth.headers
    with pytest.raises(ReferenceDataError, match="header order/version"):
        DeliverySchema.validate(headers, tmp_path / "wrong.csv", "0" * 64)


def test_strict_reference_mode_fails_when_official_unicat_and_lov_are_absent() -> None:
    settings = Settings(_env_file=None, require_official_reference_data=True)
    with pytest.raises(DatasetValidationError, match="official_unicat, official_lov"):
        load_catalog(settings)
