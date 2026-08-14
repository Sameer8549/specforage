from decimal import Decimal

from specforge.config import Settings
from specforge.contracts import (
    AttributeValue,
    ClassificationStage,
    ExtractStage,
    InputStage,
    ItemRecord,
    SourceType,
)
from specforge.data import load_catalog
from specforge.normalization import (
    AttributeVocabulary,
    canonicalize_uom,
    decimal_text_to_fraction,
    decimal_to_fraction,
    format_measurement,
)
from specforge.stages.normalize import run_normalize_stage


GROUND_PATH = "Appliances & Consumer Electronics>Kitchen Appliances>Built-In Dishwashers"
OFFICIAL_PATH = (
    "Domestic Appliances and Supplies and Consumer Electronic Products>Domestic appliances>"
    "Domestic kitchen appliances>Dishwashing machines"
)


def vocabulary() -> AttributeVocabulary:
    catalog = load_catalog(Settings())
    return AttributeVocabulary.from_ground_truth(catalog.ground_truth)


def test_vocabulary_is_derived_from_ground_truth_in_file_order() -> None:
    values = vocabulary().values_for(GROUND_PATH, "Amperage Rating")

    assert [(value.value, value.uom) for value in values] == [("15", "A"), ("10", "A")]
    assert vocabulary().values_for(GROUND_PATH, "Model") == ()


def test_uom_aliases_and_spacing_are_canonical() -> None:
    assert canonicalize_uom("volts") == "V"
    assert canonicalize_uom("pounds") == "lb"
    assert canonicalize_uom("degrees F") == "°F"
    assert canonicalize_uom("made-up-unit") is None
    assert format_measurement("120", "V") == "120 V"


def test_decimal_conversion_rounds_to_nearest_sixty_fourth() -> None:
    assert decimal_to_fraction(Decimal("24.25")) == "24-1/4"
    assert decimal_to_fraction(Decimal("0.015625")) == "1/64"
    assert decimal_text_to_fraction("24.25 x 10.5") == "24-1/4 x 10-1/2"


def test_normalize_collapses_aliases_to_ground_truth_canonicals() -> None:
    record = ItemRecord(
        input=InputStage(mfg_part_num="X", part_desc="Dishwasher 120 volts"),
        classify=ClassificationStage(
            unspsc_code="52141505",
            classpath=OFFICIAL_PATH,
            confidence=0.9,
        ),
        extract=ExtractStage(
            attributes=[
                AttributeValue(
                    label="Voltage Rating",
                    value="120 volts",
                    source_excerpt="120 volts",
                    source_type=SourceType.DESCRIPTION,
                ),
                AttributeValue(
                    label="Material",
                    value="stainless-steel",
                    source_excerpt="stainless-steel",
                    source_type=SourceType.DESCRIPTION,
                ),
            ]
        ),
    )

    result = run_normalize_stage(record, vocabulary(), Settings())

    assert result.normalize is not None
    assert [(item.value, item.uom) for item in result.normalize.attributes] == [
        ("120", "V"),
        ("Stainless Steel", None),
    ]
    assert not result.normalize.flags


def test_unmatched_value_and_uom_are_nulled_for_review() -> None:
    record = ItemRecord(
        input=InputStage(mfg_part_num="X", part_desc="Dishwasher"),
        classify=ClassificationStage(classpath=OFFICIAL_PATH, confidence=0.9),
        extract=ExtractStage(
            attributes=[
                AttributeValue(label="Voltage Rating", value="240 V"),
                AttributeValue(label="Sound Level", value="47", uom="widgets"),
            ]
        ),
    )

    result = run_normalize_stage(record, vocabulary(), Settings())

    assert result.normalize is not None
    assert all(item.value is None for item in result.normalize.attributes)
    assert [flag.code for flag in result.normalize.flags] == [
        "normalization_needs_review",
        "normalization_needs_review",
    ]


def test_empty_bucket_learns_first_sourced_value_then_constrains() -> None:
    controlled = vocabulary()
    first = controlled.constrain(GROUND_PATH, "Model", "Alpha 1", None, 0.9)
    alias = controlled.constrain(GROUND_PATH, "Model", "alpha-1", None, 0.9)
    unmatched = controlled.constrain(GROUND_PATH, "Model", "Beta 9", None, 0.9)

    assert first is not None and first.value == "Alpha 1"
    assert alias == first
    assert unmatched is None
