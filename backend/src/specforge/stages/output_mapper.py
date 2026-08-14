"""Delivery Format output mapper stage."""

from datetime import datetime, timezone

from specforge.config import Settings
from specforge.contracts import ItemRecord
from specforge.data import load_catalog
from specforge.output_mapper import map_output_row


def run_output_mapper_stage(record: ItemRecord, settings: Settings) -> ItemRecord:
    headers = load_catalog(settings).ground_truth.headers
    return record.model_copy(
        update={
            "output_row": map_output_row(record, headers),
            "updated_at": datetime.now(timezone.utc),
        },
        deep=True,
    )
