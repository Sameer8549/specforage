"""Pure-code normalization and controlled-vocabulary constraint stage."""

from datetime import datetime, timezone

from specforge.config import Settings
from specforge.contracts import AttributeValue, ItemRecord, NormalizeStage, ReviewFlag
from specforge.normalization import AttributeVocabulary, normalize_candidate


def run_normalize_stage(
    record: ItemRecord,
    vocabulary: AttributeVocabulary,
    settings: Settings,
) -> ItemRecord:
    flags: list[ReviewFlag] = []
    normalized: list[AttributeValue] = []
    extracted = record.extract.attributes if record.extract is not None else []
    classpath = record.classify.classpath if record.classify is not None else None

    if not classpath:
        flags.append(
            ReviewFlag(
                code="normalization_needs_review",
                message="No resolved classpath is available for vocabulary constraint.",
                field="classpath",
                stage="normalize",
            )
        )

    for attribute in extracted:
        value, uom, valid_uom = normalize_candidate(attribute)
        canonical = (
            vocabulary.constrain(
                classpath,
                attribute.label,
                value,
                uom,
                settings.attribute_match_threshold,
            )
            if classpath and valid_uom and value
            else None
        )
        if canonical is None:
            reason = (
                "UOM is not in the controlled UOM table."
                if not valid_uom
                else "Value did not match the controlled attribute vocabulary."
            )
            flags.append(
                ReviewFlag(
                    code="normalization_needs_review",
                    message=f"{attribute.label}: {reason}",
                    field=attribute.label,
                    stage="normalize",
                )
            )
            normalized.append(
                AttributeValue(
                    label=attribute.label,
                    value=None,
                    uom=None,
                    source_excerpt=attribute.source_excerpt,
                    source_type=attribute.source_type,
                )
            )
            continue
        normalized.append(
            AttributeValue(
                label=attribute.label,
                value=canonical.value,
                uom=canonical.uom,
                source_excerpt=attribute.source_excerpt,
                source_type=attribute.source_type,
            )
        )

    return record.model_copy(
        update={
            "normalize": NormalizeStage(attributes=normalized, flags=flags),
            "updated_at": datetime.now(timezone.utc),
        },
        deep=True,
    )
