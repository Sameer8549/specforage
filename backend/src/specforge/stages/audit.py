"""Coverage and evaluation audit stage."""

from datetime import datetime, timezone
from typing import Mapping

from specforge.audit import DESCRIPTION_FIELD_MAP, evaluate_against_ground_truth, make_unresolved_flag
from specforge.config import Settings
from specforge.contracts import AuditStage, EntailmentLabel, ItemRecord, ReviewFlag


def run_audit_stage(
    record: ItemRecord,
    settings: Settings,
    ground_truth_row: Mapping[str, str] | None = None,
) -> ItemRecord:
    status: dict[str, bool] = {}
    flags: list[ReviewFlag] = []
    resolution = record.brand_resolution

    manufacturer_ok = bool(
        resolution
        and resolution.manufacturer.canonical_name
        and resolution.manufacturer.confidence >= settings.manufacturer_match_threshold
    )
    brand_ok = bool(
        resolution
        and resolution.brand.canonical_name
        and resolution.brand.confidence >= settings.brand_match_threshold
    )
    classpath_ok = bool(
        record.classify
        and record.classify.classpath
        and record.classify.confidence >= settings.classification_threshold
    )
    status.update(
        {
            "manufacturer": manufacturer_ok,
            "brand": brand_ok,
            "classpath": classpath_ok,
        }
    )
    for field, okay in tuple(status.items()):
        if not okay:
            flags.append(make_unresolved_flag(field, f"{field.title()} is unresolved or low confidence."))

    adjudicated = {
        attribute.label: attribute
        for attribute in (record.adjudicate.attributes if record.adjudicate else [])
    }
    verified = {
        result.label: result for result in (record.verify.results if record.verify else [])
    }
    expected = record.classify.expected_attributes if record.classify else []
    compliance_total = 0
    compliance_passed = 0
    for label in expected:
        attribute = adjudicated.get(label)
        verification = verified.get(label)
        okay = bool(
            attribute
            and attribute.value is not None
            and verification
            and verification.entailment == EntailmentLabel.SUPPORTED
            and verification.confidence >= settings.verification_confidence_threshold
            and verification.vocabulary_compliant
            and verification.uom_compliant
        )
        status[f"attribute:{label}"] = okay
        compliance_total += 1
        if verification and verification.vocabulary_compliant and verification.uom_compliant:
            compliance_passed += 1
        if not okay:
            flags.append(
                make_unresolved_flag(
                    f"attribute:{label}",
                    f"{label} lacks supported, confident, vocabulary-compliant evidence.",
                )
            )

    description_compliant = bool(
        record.description and record.description.character_limit_compliant
    )
    for delivery_field, contract_field in DESCRIPTION_FIELD_MAP.items():
        value = getattr(record.description, contract_field) if record.description else None
        okay = bool(value) and description_compliant
        status[f"description:{delivery_field}"] = okay
        if not okay:
            flags.append(
                make_unresolved_flag(
                    f"description:{delivery_field}",
                    f"{delivery_field} is blank or outside its character requirements.",
                )
            )

    resolved = sum(status.values())
    total = len(status)
    coverage = round(100 * resolved / total, 2) if total else 0.0
    vocabulary_compliance = (
        round(100 * compliance_passed / compliance_total, 2) if compliance_total else 100.0
    )
    description_total = len(DESCRIPTION_FIELD_MAP)
    description_passed = sum(
        status[f"description:{field}"] for field in DESCRIPTION_FIELD_MAP
    )
    character_compliance = round(100 * description_passed / description_total, 2)

    accuracy = None
    gaps: list[str] = []
    if ground_truth_row is not None:
        accuracy, gaps = evaluate_against_ground_truth(record, ground_truth_row)
    if record.adjudicate and record.adjudicate.needs_human_review:
        gaps.append("Adjudication explicitly requires human review.")

    routed = bool(flags) or bool(record.adjudicate and record.adjudicate.needs_human_review)
    return record.model_copy(
        update={
            "audit": AuditStage(
                coverage_percent=coverage,
                resolved_fields=resolved,
                total_fields=total,
                needs_human_review=routed,
                accuracy=accuracy,
                field_status=status,
                vocabulary_compliance_percent=vocabulary_compliance,
                character_limit_compliance_percent=character_compliance,
                routed_to_review=routed,
                gap_report=gaps,
                flags=flags,
            ),
            "updated_at": datetime.now(timezone.utc),
        },
        deep=True,
    )
