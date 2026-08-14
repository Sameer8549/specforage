from specforge.config import Settings
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
