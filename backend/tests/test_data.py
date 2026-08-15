from pathlib import Path

from specforge.config import Settings, _default_data_root
from specforge.data import WORKING_HEADERS, item_record_from_row, iter_csv_rows, load_catalog


def test_supplied_datasets_load_and_validate() -> None:
    catalog = load_catalog(Settings())

    assert catalog.working.row_count == 1000
    assert catalog.working.headers == WORKING_HEADERS
    assert catalog.ground_truth.row_count == 2
    assert len(catalog.ground_truth.headers) == 252


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
