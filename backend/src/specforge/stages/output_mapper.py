"""Delivery Format output mapper stage."""

from collections.abc import Iterable
from datetime import datetime, timezone

from specforge.contracts import ItemRecord
from specforge.output_mapper import map_output_row


def run_output_mapper_stage(record: ItemRecord, headers: Iterable[str]) -> ItemRecord:
    return record.model_copy(
        update={
            "output_row": map_output_row(record, headers),
            "updated_at": datetime.now(timezone.utc),
        },
        deep=True,
    )
