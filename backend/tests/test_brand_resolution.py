import pytest

from specforge.config import Settings
from specforge.contracts import CleanStage, InputStage, ItemRecord
from specforge.data import load_catalog
from specforge.manufacturer_lookup import MPNWebManufacturerLookup, ManufacturerLookupResult
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
    assert vocabularies.brand_manufacturers[entity_key("Whirlpool®")] == "Whirlpool Corporation"


@pytest.mark.asyncio
async def test_resolved_brand_uses_known_manufacturer_pair_before_part_manuf() -> None:
    settings = Settings()
    vocabularies = build_resolution_vocabularies(load_catalog(settings))
    record = ItemRecord(
        input=InputStage(mfg_part_num="X", part_desc="Example"),
        clean=CleanStage(
            mfg_part_num="X",
            part_desc="Example",
            dib_brand="Whirlpool",
            part_manuf="Appliance Dealers Cooperative (APPDE)",
        ),
    )

    result = await run_brand_resolution_stage(record, vocabularies, settings)

    assert result.brand_resolution is not None
    assert result.brand_resolution.manufacturer.canonical_name == "Whirlpool Corporation"
    assert result.brand_resolution.manufacturer_source == "brand_manufacturer_pair"
    assert entity_key(result.brand_resolution.brand.canonical_name) == "whirlpool"
    assert len(result.brand_resolution.brand.candidates) == 3
    assert not result.brand_resolution.flags


@pytest.mark.asyncio
async def test_unresolved_and_conflicting_values_are_flagged() -> None:
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

    result = await run_brand_resolution_stage(record, vocabularies, settings)
    assert result.brand_resolution is not None
    assert result.brand_resolution.manufacturer.canonical_name is None
    assert result.brand_resolution.brand.canonical_name is None
    assert {flag.code for flag in result.brand_resolution.flags} == {
        "manufacturer_unresolved",
        "brand_unresolved",
        "brand_conflict",
    }


@pytest.mark.asyncio
async def test_brandless_record_attempts_mpn_lookup_before_distributor_field() -> None:
    class Lookup:
        calls = 0

        async def lookup(self, mfg_part_num: str, part_desc: str | None):
            self.calls += 1
            assert mfg_part_num == "WDTS7024RZ"
            return ManufacturerLookupResult("Whirlpool Corporation", 0.93)

    class DomainResolver:
        calls: list[str] = []

        async def resolve(self, manufacturer: str) -> str | None:
            self.calls.append(manufacturer)
            return "whirlpool.com"

    settings = Settings()
    vocabularies = build_resolution_vocabularies(load_catalog(settings))
    lookup = Lookup()
    domain_resolver = DomainResolver()
    record = ItemRecord(
        input=InputStage(mfg_part_num="WDTS7024RZ", part_desc="Dishwasher"),
        clean=CleanStage(
            mfg_part_num="WDTS7024RZ",
            part_desc="Dishwasher",
            part_manuf="Appliance Dealers Cooperative (APPDE)",
        ),
    )

    result = await run_brand_resolution_stage(
        record, vocabularies, settings, lookup, domain_resolver
    )

    assert lookup.calls == 1
    assert result.brand_resolution is not None
    assert result.brand_resolution.manufacturer.canonical_name == "Whirlpool Corporation"
    assert result.brand_resolution.manufacturer_source == "mpn_web_lookup"
    assert result.brand_resolution.mpn_lookup_attempted is True
    assert result.brand_resolution.manufacturer_domain == "whirlpool.com"
    assert domain_resolver.calls == ["Whirlpool Corporation"]
    assert not any(
        flag.code == "low_confidence_distributor_field_used"
        for flag in result.brand_resolution.flags
    )


@pytest.mark.asyncio
async def test_mpn_lookup_caches_successful_result_by_normalized_part_number() -> None:
    settings = Settings()
    vocabularies = build_resolution_vocabularies(load_catalog(settings))
    lookup = MPNWebManufacturerLookup(
        vocabularies.manufacturers,
        vocabularies.brands,
        vocabularies.brand_manufacturers,
    )
    calls = 0

    async def fake_live_lookup(mfg_part_num: str, part_desc: str | None):
        nonlocal calls
        calls += 1
        return ManufacturerLookupResult("Whirlpool Corporation", 0.93)

    lookup._lookup_uncached = fake_live_lookup  # type: ignore[method-assign]

    first = await lookup.lookup("WDTS-7024RZ", "Dishwasher")
    second = await lookup.lookup("wdts 7024rz", "Different description")

    assert first == second == ManufacturerLookupResult("Whirlpool Corporation", 0.93)
    assert calls == 1


@pytest.mark.asyncio
async def test_mpn_lookup_caches_no_result_for_repeatable_fallback() -> None:
    settings = Settings()
    vocabularies = build_resolution_vocabularies(load_catalog(settings))
    lookup = MPNWebManufacturerLookup(
        vocabularies.manufacturers,
        vocabularies.brands,
        vocabularies.brand_manufacturers,
    )
    calls = 0

    async def fake_live_lookup(mfg_part_num: str, part_desc: str | None):
        nonlocal calls
        calls += 1
        return None

    lookup._lookup_uncached = fake_live_lookup  # type: ignore[method-assign]

    assert await lookup.lookup("PDSH4816AF", "Dishwasher") is None
    assert await lookup.lookup("pdsh4816af", "Changed description") is None
    assert calls == 1


@pytest.mark.asyncio
async def test_part_manuf_fallback_is_capped_and_explicitly_flagged() -> None:
    settings = Settings()
    vocabularies = build_resolution_vocabularies(load_catalog(settings))
    record = ItemRecord(
        input=InputStage(mfg_part_num="X", part_desc="Unknown"),
        clean=CleanStage(
            mfg_part_num="X",
            part_desc="Unknown",
            part_manuf="Appliance Dealers Cooperative (APPDE)",
        ),
    )

    result = await run_brand_resolution_stage(record, vocabularies, settings)

    assert result.brand_resolution is not None
    assert result.brand_resolution.manufacturer.canonical_name == "Appliance Dealers Cooperative"
    assert result.brand_resolution.manufacturer.confidence == 0.65
    assert result.brand_resolution.manufacturer_source == "part_manuf_fallback"
    assert {flag.code for flag in result.brand_resolution.flags} >= {
        "manufacturer_unresolved",
        "brand_unresolved",
        "low_confidence_distributor_field_used",
    }
