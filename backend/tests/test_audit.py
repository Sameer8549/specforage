from specforge.audit import aggregate_accuracy, evaluate_against_ground_truth
from specforge.config import Settings
from specforge.contracts import (
    AdjudicateStage,
    AttributeValue,
    BrandResolutionStage,
    ClassificationStage,
    DescriptionStage,
    EntityResolution,
    EntailmentLabel,
    InputStage,
    ItemRecord,
    Verification,
    VerifyStage,
)
from specforge.data import iter_csv_rows, load_catalog
from specforge.stages.audit import run_audit_stage


def complete_record() -> ItemRecord:
    expected = ["Voltage Rating", "Material"]
    attributes = [
        AttributeValue(label="Voltage Rating", value="120", uom="V"),
        AttributeValue(label="Material", value="Stainless Steel"),
    ]
    verifications = [
        Verification(
            label=attribute.label,
            value=attribute.value,
            entailment=EntailmentLabel.SUPPORTED,
            confidence=0.95,
            reasoning="Explicitly supported.",
            vocabulary_compliant=True,
            uom_compliant=True,
        )
        for attribute in attributes
    ]
    return ItemRecord(
        input=InputStage(mfg_part_num="X", part_desc="Dishwasher"),
        brand_resolution=BrandResolutionStage(
            manufacturer=EntityResolution(canonical_name="Acme Corp", confidence=0.99),
            brand=EntityResolution(canonical_name="Acme", confidence=0.99),
        ),
        classify=ClassificationStage(
            unspsc_code="52141505",
            classpath="Appliances>Dishwashers",
            confidence=0.9,
            expected_attributes=expected,
        ),
        verify=VerifyStage(results=verifications),
        adjudicate=AdjudicateStage(attributes=attributes),
        description=DescriptionStage(
            mobile_desc="A" * 60,
            invoice_desc="DISHWASHER",
            short_desc="Acme Dishwasher",
            long_desc1="Acme Dishwasher, 120 V, Stainless Steel",
            retail_desc="Dishwasher, Stainless Steel",
            marketing_description="Factual sourced description",
            character_limit_compliant=True,
        ),
    )


def test_complete_supported_record_has_full_coverage() -> None:
    result = run_audit_stage(complete_record(), Settings())

    assert result.audit is not None
    assert result.audit.coverage_percent == 100
    assert result.audit.resolved_fields == 11
    assert result.audit.total_fields == 11
    assert result.audit.vocabulary_compliance_percent == 100
    assert result.audit.character_limit_compliance_percent == 100
    assert result.audit.routed_to_review is False


def test_attribute_requires_supported_high_confidence_entailment() -> None:
    record = complete_record()
    results = list(record.verify.results)
    results[0] = results[0].model_copy(
        update={"entailment": EntailmentLabel.PARTIALLY_SUPPORTED, "confidence": 0.99}
    )
    record = record.model_copy(update={"verify": VerifyStage(results=results)})

    audited = run_audit_stage(record, Settings()).audit

    assert audited is not None
    assert audited.field_status["attribute:Voltage Rating"] is False
    assert audited.routed_to_review is True


def test_low_confidence_entity_and_blank_marketing_reduce_coverage() -> None:
    record = complete_record()
    record = record.model_copy(
        update={
            "brand_resolution": record.brand_resolution.model_copy(
                update={"brand": EntityResolution(canonical_name="Acme", confidence=0.2)}
            ),
            "description": record.description.model_copy(update={"marketing_description": None}),
        }
    )

    audited = run_audit_stage(record, Settings()).audit

    assert audited is not None
    assert audited.coverage_percent == 81.82
    assert audited.field_status["brand"] is False
    assert audited.field_status["description:MARKETING_DESCRIPTION"] is False


def test_evaluation_ignores_blank_targets_and_reports_known_gaps() -> None:
    ground_truth = next(iter_csv_rows(load_catalog(Settings()).ground_truth))
    record = complete_record()
    accuracy, gaps = evaluate_against_ground_truth(record, ground_truth)

    assert set(accuracy) == {
        "manufacturer",
        "brand",
        "classpath",
        "attributes",
        "descriptions",
        "overall",
    }
    assert any("UNSPSC" in gap for gap in gaps)
    assert any("Country Of Origin" in gap for gap in gaps)
    assert any("Manufacturer differs" in gap for gap in gaps)


def test_evaluation_mode_attaches_accuracy_and_gap_report() -> None:
    ground_truth = next(iter_csv_rows(load_catalog(Settings()).ground_truth))
    audited = run_audit_stage(complete_record(), Settings(), ground_truth).audit

    assert audited is not None
    assert audited.accuracy is not None
    assert "overall" in audited.accuracy
    assert len(audited.gap_report) >= 2


def test_aggregate_accuracy_uses_only_present_breakdowns() -> None:
    result = aggregate_accuracy(
        [
            {"overall": 50.0, "brand": 100.0},
            {"overall": 100.0, "manufacturer": 0.0},
        ]
    )

    assert result == {"brand": 100.0, "manufacturer": 0.0, "overall": 75.0}
