import pytest

from specforge.config import Settings
from specforge.contracts import (
    AdjudicateStage,
    AttributeValue,
    AuditStage,
    BrandResolutionStage,
    ClassificationStage,
    CleanStage,
    DescriptionStage,
    EntityResolution,
    InputStage,
    ItemRecord,
    SourceType,
    Verification,
    VerifyStage,
    EntailmentLabel,
)
from specforge.data import load_catalog
from specforge.output_mapper import OutputMappingError, map_output_row
from specforge.stages.output_mapper import run_output_mapper_stage


def audited_record() -> ItemRecord:
    attribute = AttributeValue(
        label="Voltage Rating",
        value="120",
        uom="V",
        confidence=0.91,
        source_excerpt="120 V",
        source_type=SourceType.DESCRIPTION,
    )
    return ItemRecord(
        input=InputStage(mfg_part_num="ABC-1", part_desc="Original description"),
        clean=CleanStage(mfg_part_num="ABC-1", part_desc="Clean description"),
        brand_resolution=BrandResolutionStage(
            manufacturer=EntityResolution(canonical_name="Acme Corp", confidence=0.96),
            brand=EntityResolution(canonical_name="Acme", confidence=0.94),
        ),
        classify=ClassificationStage(
            unspsc_code="52141505",
            classpath="Appliances>Dishwashers",
            confidence=0.9,
            expected_attributes=["Voltage Rating", "Material"],
        ),
        adjudicate=AdjudicateStage(attributes=[attribute]),
        verify=VerifyStage(
            results=[
                Verification(
                    label="Voltage Rating",
                    value="120",
                    entailment=EntailmentLabel.SUPPORTED,
                    confidence=0.93,
                    reasoning="Explicit",
                    vocabulary_compliant=True,
                    uom_compliant=True,
                )
            ]
        ),
        description=DescriptionStage(
            mobile_desc="Acme Dishwasher ABC-1",
            invoice_desc="DISHWASHER 120V",
        ),
        audit=AuditStage(
            field_status={
                "manufacturer": True,
                "brand": False,
                "classpath": True,
                "attribute:Voltage Rating": True,
                "attribute:Material": False,
                "description:MOBILE_DESC": True,
                "description:INVOICE_DESC": False,
            }
        ),
    )


def test_mapper_preserves_exact_ground_truth_header_order() -> None:
    settings = Settings()
    headers = load_catalog(settings).ground_truth.headers
    output = map_output_row(audited_record(), headers)

    assert tuple(output.header_order) == headers
    assert list(output.values) == list(headers)
    assert len(output.values) == len(headers)


def test_mapper_populates_only_resolved_enrichments() -> None:
    headers = load_catalog(Settings()).ground_truth.headers
    output = map_output_row(audited_record(), headers)

    assert output.values["Mfg_Part_Num"] == "ABC-1"
    assert output.values["MANUFACTURER_PART_NUMBER"] == "ABC-1"
    assert output.values["MANUFACTURER_NAME"] == "Acme Corp"
    assert output.values["BRAND_NAME"] is None
    assert output.values["Classpath"] == "Appliances>Dishwashers"
    assert output.values["UNSPSC"] == "52141505"
    assert output.values["MOBILE_DESC"] == "Acme Dishwasher ABC-1"
    assert output.values["INVOICE_DESC"] is None
    assert output.values["Country Of Origin"] is None


def test_mapper_places_supported_attributes_in_numbered_slots() -> None:
    headers = load_catalog(Settings()).ground_truth.headers
    output = map_output_row(audited_record(), headers)

    assert output.values["ATTRIBUTE_LABEL 1"] == "Voltage Rating"
    assert output.values["ATTRIBUTE_VALUE 1"] == "120"
    assert output.values["ATTRIBUTE_UOM 1"] == "V"
    assert output.values["ATTRIBUTE_LABEL 2"] is None
    assert output.provenance["ATTRIBUTE_VALUE 1"].confidence == 0.93
    assert output.provenance["ATTRIBUTE_VALUE 1"].source_excerpt == "120 V"


def test_mapper_includes_provenance_for_every_populated_field() -> None:
    headers = load_catalog(Settings()).ground_truth.headers
    output = map_output_row(audited_record(), headers)

    populated = {field for field, value in output.values.items() if value is not None}
    assert populated == set(output.provenance)
    assert output.provenance["MANUFACTURER_NAME"].stage == "brand_resolution"


def test_mapper_requires_audit_and_rejects_duplicate_headers() -> None:
    record = audited_record().model_copy(update={"audit": None})
    with pytest.raises(OutputMappingError, match="Audit"):
        map_output_row(record, ["Mfg_Part_Num"])
    with pytest.raises(OutputMappingError, match="duplicate"):
        map_output_row(audited_record(), ["A", "A"])


def test_stage_attaches_output_without_overwriting_prior_stages() -> None:
    record = audited_record()
    result = run_output_mapper_stage(
        record, load_catalog(Settings()).delivery_schema.headers
    )

    assert result.output_row is not None
    assert result.audit == record.audit
    assert result.description == record.description
