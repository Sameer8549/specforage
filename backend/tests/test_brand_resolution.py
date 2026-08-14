from specforge.config import Settings
from specforge.contracts import CleanStage, InputStage, ItemRecord
from specforge.data import load_catalog
from specforge.stages.brand_resolution import (
    build_resolution_vocabularies,
    run_brand_resolution_stage,
)
from specforge.vocabulary import EntityVocabulary, display_name, entity_key


def test_suffix_and_vendor_code_normalization() -> None:
    assert display_name("Freud Inc (2435)") == "Freud Inc"
    assert entity_key("3M") == entity_key("3M Company")
    assert entity_key("Acme Corp.") == entity_key("ACME LLC")


def test_vocabulary_clusters_aliases_and_returns_three_candidates() -> None:
    vocabulary = EntityVocabulary(["3M", "3M Company", "Acme Corp", "Beta LLC", "Gamma Inc"])

    assert len([entry for entry in vocabulary.entries if entry.key == "3m"]) == 1
    ranked = vocabulary.rank("Acme Company")
    assert ranked[0][0].canonical_name == "Acme Corp"
    assert len(ranked) == 3


def test_dataset_vocabularies_are_self_derived() -> None:
    vocabularies = build_resolution_vocabularies(load_catalog(Settings()))

    assert any(entry.canonical_name == "Freud Inc" for entry in vocabularies.manufacturers.entries)
    assert any(entry.canonical_name == "Diablo" for entry in vocabularies.brands.entries)
    assert all("No Unilog Brand" not in entry.canonical_name for entry in vocabularies.brands.entries)


def test_resolution_returns_canonical_values_and_top_three() -> None:
    settings = Settings()
    vocabularies = build_resolution_vocabularies(load_catalog(settings))
    record = ItemRecord(
        input=InputStage(mfg_part_num="X", part_desc="Example"),
        clean=CleanStage(
            mfg_part_num="X",
            part_desc="Example",
            dib_brand="diablos",
            part_manuf="Freud Incorporated",
        ),
    )

    result = run_brand_resolution_stage(record, vocabularies, settings)

    assert result.brand_resolution is not None
    assert result.brand_resolution.manufacturer.canonical_name == "Freud Inc"
    assert result.brand_resolution.brand.canonical_name == "Diablo"
    assert len(result.brand_resolution.brand.candidates) == 3
    assert not result.brand_resolution.flags


def test_unresolved_and_conflicting_values_are_flagged() -> None:
    settings = Settings()
    vocabularies = build_resolution_vocabularies(load_catalog(settings))
    record = ItemRecord(
        input=InputStage(mfg_part_num="X", part_desc="Example"),
        clean=CleanStage(
            mfg_part_num="X",
            part_desc="Example",
            e1_brand="TREX",
            dib_brand="Diablo",
            part_manuf=None,
        ),
    )

    result = run_brand_resolution_stage(record, vocabularies, settings)
    assert result.brand_resolution is not None
    assert result.brand_resolution.manufacturer.canonical_name is None
    assert result.brand_resolution.brand.canonical_name is None
    assert {flag.code for flag in result.brand_resolution.flags} == {
        "manufacturer_unresolved",
        "brand_unresolved",
        "brand_conflict",
    }
