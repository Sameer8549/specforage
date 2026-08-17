"""Deterministic mapping from the pipeline contract to Delivery Format columns."""

import re
from collections.abc import Iterable

from specforge.audit import DESCRIPTION_FIELD_MAP
from specforge.contracts import ItemRecord, OutputRowStage, Provenance
from specforge.reference_data import DELIVERY_COLUMN_COUNT


_ATTRIBUTE_SLOT = re.compile(r"^ATTRIBUTE_LABEL (\d+)$")


class OutputMappingError(RuntimeError):
    """Raised when a record cannot safely be mapped to Delivery Format."""


def map_output_row(record: ItemRecord, headers: Iterable[str]) -> OutputRowStage:
    """Map one audited record without inventing values for unsupported columns."""
    header_order = list(headers)
    if record.audit is None:
        raise OutputMappingError("Audit must run before output mapping.")
    if len(header_order) != len(set(header_order)):
        raise OutputMappingError("Delivery Format contains duplicate column headers.")
    if len(header_order) != DELIVERY_COLUMN_COUNT:
        raise OutputMappingError(
            f"Delivery Format must contain exactly {DELIVERY_COLUMN_COUNT} columns."
        )
    values: dict[str, str | None] = {header: None for header in header_order}
    provenance: dict[str, Provenance] = {}

    def put(field: str, value: str | None, source: Provenance) -> None:
        if field in values and value is not None and str(value).strip():
            values[field] = str(value)
            provenance[field] = source

    clean = record.clean
    # Delivery-format source columns preserve the submitted catalog record exactly.
    # Placeholder removal is an internal cleaning concern and must not erase inputs
    # that the official output format expects to be carried through unchanged.
    source_values = {
        "Mfg_Part_Num": record.input.mfg_part_num,
        "Part_Desc": record.input.part_desc,
        "E1_Brand": record.input.e1_brand,
        "Unilog_Brand": record.input.unilog_brand,
        "DIB_Brand": record.input.dib_brand,
        "Part_Manuf": record.input.part_manuf,
    }
    input_provenance = Provenance(stage="input", confidence=1.0)
    for field, value in source_values.items():
        put(field, value, input_provenance)
    put("MANUFACTURER_PART_NUMBER", source_values["Mfg_Part_Num"], input_provenance)

    resolution = record.brand_resolution
    if resolution and record.audit.field_status.get("manufacturer", False):
        put(
            "MANUFACTURER_NAME",
            resolution.manufacturer.canonical_name,
            Provenance(stage="brand_resolution", confidence=resolution.manufacturer.confidence),
        )
    if resolution and record.audit.field_status.get("brand", False):
        put(
            "BRAND_NAME",
            resolution.brand.canonical_name,
            Provenance(stage="brand_resolution", confidence=resolution.brand.confidence),
        )

    classification = record.classify
    if classification and record.audit.field_status.get("classpath", False):
        classification_source = Provenance(
            stage="classify", confidence=classification.confidence
        )
        put("Classpath", classification.classpath, classification_source)
        put("UNSPSC", classification.unspsc_code, classification_source)

    description = record.description
    if description:
        put(
            "Product Name",
            description.product_name,
            Provenance(stage="description", confidence=1.0),
        )
        for delivery_field, contract_field in DESCRIPTION_FIELD_MAP.items():
            if record.audit.field_status.get(f"description:{delivery_field}", False):
                put(
                    delivery_field,
                    getattr(description, contract_field),
                    Provenance(stage="description", confidence=1.0),
                )

    attribute_slots = sorted(
        int(match.group(1))
        for header in header_order
        if (match := _ATTRIBUTE_SLOT.match(header))
    )
    attributes = {
        attribute.label: attribute
        for attribute in (record.adjudicate.attributes if record.adjudicate else [])
    }
    verification = {
        result.label: result for result in (record.verify.results if record.verify else [])
    }
    expected_order = classification.expected_attributes if classification else []
    # Expected labels define stable schema slots even when a product value is absent.
    # Never compact resolved values into earlier slots: doing so changes their meaning.
    for slot, label in zip(attribute_slots, expected_order, strict=False):
        label_source = Provenance(
            stage="classify",
            confidence=classification.confidence if classification else 0.0,
        )
        put(f"ATTRIBUTE_LABEL {slot}", label, label_source)
        attribute = attributes.get(label)
        if attribute is None or not record.audit.field_status.get(f"attribute:{label}", False):
            continue
        verified = verification.get(label)
        source = Provenance(
            stage="adjudicate",
            confidence=verified.confidence if verified else attribute.confidence,
            source_type=attribute.source_type,
            source_excerpt=attribute.source_excerpt,
        )
        put(f"ATTRIBUTE_VALUE {slot}", attribute.value, source)
        put(f"ATTRIBUTE_UOM {slot}", attribute.uom, source)

    return OutputRowStage(
        values=values,
        header_order=header_order,
        provenance=provenance,
    )
