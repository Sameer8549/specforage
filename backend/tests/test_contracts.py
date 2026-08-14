from specforge.contracts import InputStage, ItemRecord


def test_item_record_starts_with_input_namespace_only() -> None:
    record = ItemRecord(input=InputStage(mfg_part_num="ABC-1", part_desc="Example"))

    assert record.input.mfg_part_num == "ABC-1"
    assert record.clean is None
    assert record.output_row is None
    assert record.schema_version == "1.0"
