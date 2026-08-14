from specforge.config import Settings
from specforge.contracts import (
    AdjudicateStage,
    AttributeValue,
    BrandResolutionStage,
    ClassificationStage,
    CleanStage,
    EntityResolution,
    InputStage,
    ItemRecord,
)
from specforge.data import load_catalog
from specforge.descriptions import DescriptionFormulaCatalog
from specforge.stages.description import run_description_stage


GROUND_PATH = "Appliances & Consumer Electronics>Kitchen Appliances>Built-In Dishwashers"
OFFICIAL_PATH = (
    "Domestic Appliances and Supplies and Consumer Electronic Products>Domestic appliances>"
    "Domestic kitchen appliances>Dishwashing machines"
)


def catalog() -> DescriptionFormulaCatalog:
    return DescriptionFormulaCatalog.from_ground_truth(load_catalog(Settings()).ground_truth)


def whirlpool_record() -> ItemRecord:
    attributes = [
        AttributeValue(label="Series", value="Eco Series"),
        AttributeValue(label="Voltage Rating", value="120", uom="V"),
        AttributeValue(label="Amperage Rating", value="10", uom="A"),
        AttributeValue(label="Mounting Type", value="Built-in"),
        AttributeValue(label="Size", value="33-7/16 in H x 23-7/8 in W x 22-5/8 in D"),
        AttributeValue(label="Depth With Door Open", value="50-3/16", uom="in"),
        AttributeValue(label="Minimum Height", value="33-7/16", uom="in"),
        AttributeValue(label="Sound Level", value="41", uom="dBA"),
        AttributeValue(label="Material", value="Stainless Steel"),
        AttributeValue(label="Color", value="Stainless Steel"),
    ]
    return ItemRecord(
        input=InputStage(mfg_part_num="WDTS7024RZ", part_desc="Dishwasher"),
        clean=CleanStage(mfg_part_num="WDTS7024RZ", part_desc="Dishwasher"),
        brand_resolution=BrandResolutionStage(
            manufacturer=EntityResolution(canonical_name="Whirlpool Corporation", confidence=1),
            brand=EntityResolution(canonical_name="Whirlpool", confidence=1),
        ),
        classify=ClassificationStage(
            unspsc_code="52141505", classpath=OFFICIAL_PATH, confidence=0.9
        ),
        adjudicate=AdjudicateStage(attributes=attributes),
    )


def test_limits_and_product_formula_are_derived_from_ground_truth() -> None:
    formulas = catalog()

    assert formulas.product_name_for(OFFICIAL_PATH) == "Dishwasher"
    assert formulas.limits.mobile == 80
    assert formulas.limits.invoice == 40
    assert formulas.limits.short == 115
    assert formulas.limits.long == 405
    assert formulas.limits.retail == 75


def test_whirlpool_descriptions_follow_ground_truth_grammar() -> None:
    result = run_description_stage(whirlpool_record(), catalog())

    assert result.description is not None
    assert result.description.mobile_desc == (
        "Whirlpool, Dishwasher, Eco Series, WDTS7024RZ, Built-in Mounting"
    )
    assert result.description.invoice_desc == "DISHWASHER BLTLN SST SST 120V 10A 41DBA"
    assert result.description.short_desc == (
        "Whirlpool Eco Series WDTS7024RZ Dishwasher, Built-in Mounting, "
        "Stainless Steel, Stainless Steel"
    )
    assert result.description.retail_desc == (
        "Eco Series Dishwasher, Built-in Mounting, Stainless Steel, Stainless Steel"
    )
    assert result.description.marketing_description is None
    assert result.description.character_limit_compliant is True


def test_cycle_count_branch_uses_depth_as_invoice_differentiator() -> None:
    record = whirlpool_record()
    attributes = [
        AttributeValue(label="Series", value="Professional Series"),
        AttributeValue(label="Number of Wash Cycles", value="5"),
        AttributeValue(label="Voltage Rating", value="120", uom="V"),
        AttributeValue(label="Amperage Rating", value="15", uom="A"),
        AttributeValue(label="Mounting Type", value="Leg"),
        AttributeValue(label="Depth With Door Open", value="50-1/4", uom="in"),
        AttributeValue(label="Sound Level", value="47", uom="dBA"),
        AttributeValue(label="Material", value="Stainless Steel"),
    ]
    record = record.model_copy(
        update={
            "clean": CleanStage(mfg_part_num="PDSH4816AF", part_desc="Dishwasher"),
            "adjudicate": AdjudicateStage(attributes=attributes),
        }
    )

    result = run_description_stage(record, catalog()).description

    assert result is not None
    assert result.invoice_desc == "DISHWASHER LEG 5 SST 120V 15A 50-1/4IN"


def test_every_generated_description_respects_learned_limit() -> None:
    result = run_description_stage(whirlpool_record(), catalog()).description
    assert result is not None
    limits = catalog().limits

    assert len(result.mobile_desc or "") <= limits.mobile
    assert len(result.invoice_desc or "") <= limits.invoice
    assert len(result.short_desc or "") <= limits.short
    assert len(result.long_desc1 or "") <= limits.long
    assert len(result.retail_desc or "") <= limits.retail


def test_sparse_values_are_not_padded_or_invented() -> None:
    record = ItemRecord(
        input=InputStage(mfg_part_num="X1", part_desc="Unknown"),
        clean=CleanStage(mfg_part_num="X1", part_desc="Unknown"),
        classify=ClassificationStage(classpath=GROUND_PATH, confidence=0.9),
        adjudicate=AdjudicateStage(),
    )

    result = run_description_stage(record, catalog()).description

    assert result is not None
    assert result.mobile_desc == "Dishwasher, X1"
    assert result.marketing_description is None
    assert result.character_limit_compliant is False
    assert {flag.code for flag in result.flags} == {"mobile_description_below_target"}


def test_token_aware_limit_enforcement_omits_whole_components() -> None:
    record = whirlpool_record()
    attributes = list(record.adjudicate.attributes)
    attributes.append(AttributeValue(label="Number of Wash Cycles", value="1234567890"))
    record = record.model_copy(update={"adjudicate": AdjudicateStage(attributes=attributes)})

    result = run_description_stage(record, catalog()).description

    assert result is not None
    assert len(result.invoice_desc or "") <= 40
    assert any(flag.code == "description_truncated" for flag in result.flags)
