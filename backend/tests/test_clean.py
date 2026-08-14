from specforge.contracts import InputStage, ItemRecord
from specforge.config import Settings
from specforge.data import item_record_from_row, iter_csv_rows, load_catalog
from specforge.stages.clean import clean_text, is_placeholder, run_clean_stage


def test_placeholder_variants_are_detected() -> None:
    placeholders = [
        "-- Unbranded --",
        "-- No Unilog Brand --",
        "-- No DIB Brand --",
        "COMMODITY - UNBRANDED",
        " - ",
        "N/A",
        "unknown",
        "  ",
    ]

    assert all(is_placeholder(value) for value in placeholders)
    assert not is_placeholder("Unknown Industries LLC")


def test_text_cleaning_is_conservative() -> None:
    assert clean_text("  3M\t775L   P150\x00  ") == "3M 775L P150"
    assert clean_text("AB–123") == "AB-123"
    assert clean_text(None) is None


def test_clean_stage_appends_namespace_without_mutating_input() -> None:
    record = ItemRecord(
        input=InputStage(
            mfg_part_num="  DCB518ASTS06G  ",
            part_desc='DCB518ASTS06G  Diablo 1/2"x18"',
            e1_brand="-- Unbranded --",
            unilog_brand="-- No Unilog Brand --",
            dib_brand="Diablo",
            part_manuf="Freud Inc (2435)",
        )
    )

    result = run_clean_stage(record)

    assert record.clean is None
    assert record.input.mfg_part_num == "  DCB518ASTS06G  "
    assert result.clean is not None
    assert result.clean.mfg_part_num == "DCB518ASTS06G"
    assert result.clean.e1_brand is None
    assert result.clean.unilog_brand is None
    assert result.clean.dib_brand == "Diablo"
    assert result.clean.nullified_fields == ["e1_brand", "unilog_brand"]


def test_clean_stage_nullifies_actual_dataset_placeholders() -> None:
    record = ItemRecord(
        input=InputStage(
            mfg_part_num="ABC",
            part_desc="Example",
            e1_brand="COMMODITY - UNBRANDED",
            part_manuf="-",
        )
    )

    result = run_clean_stage(record)

    assert result.clean is not None
    assert result.clean.e1_brand is None
    assert result.clean.part_manuf is None
    assert result.clean.nullified_fields == ["e1_brand", "part_manuf"]


def test_clean_stage_processes_all_working_rows() -> None:
    catalog = load_catalog(Settings())
    nullified_counts: dict[str, int] = {}

    for row_number, row in enumerate(iter_csv_rows(catalog.working), start=1):
        cleaned = run_clean_stage(item_record_from_row(row, row_number)).clean
        assert cleaned is not None
        for field in cleaned.nullified_fields:
            nullified_counts[field] = nullified_counts.get(field, 0) + 1

    assert row_number == 1000
    assert nullified_counts == {
        "e1_brand": 803,
        "unilog_brand": 1000,
        "dib_brand": 755,
        "part_manuf": 41,
    }
