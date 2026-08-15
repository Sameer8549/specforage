"""MPN web-search lookup used when catalog brand evidence is absent."""

import html
import re
from dataclasses import dataclass
from typing import Protocol

import httpx
from rapidfuzz import fuzz

from specforge.vocabulary import EntityVocabulary, entity_key


_HTML_TAG = re.compile(r"<[^>]+>")
_RESULT_TEXT = re.compile(
    r'class="result__(?:title|snippet)[^"]*"[^>]*>(.*?)</(?:a|div)>',
    re.IGNORECASE | re.DOTALL,
)


@dataclass(frozen=True, slots=True)
class ManufacturerLookupResult:
    manufacturer: str
    confidence: float
    source_url: str | None = None


class ManufacturerLookup(Protocol):
    async def lookup(
        self, mfg_part_num: str, part_desc: str | None
    ) -> ManufacturerLookupResult | None: ...


class MPNWebManufacturerLookup:
    """Search an MPN and resolve explicit brand/manufacturer mentions from results."""

    def __init__(
        self,
        manufacturers: EntityVocabulary,
        brands: EntityVocabulary,
        brand_manufacturers: dict[str, str],
        timeout_seconds: float = 8.0,
    ) -> None:
        self.manufacturers = manufacturers
        self.brands = brands
        self.brand_manufacturers = brand_manufacturers
        self.timeout_seconds = timeout_seconds

    async def lookup(
        self, mfg_part_num: str, part_desc: str | None
    ) -> ManufacturerLookupResult | None:
        query = f'"{mfg_part_num}" manufacturer brand {part_desc or ""}'.strip()
        try:
            async with httpx.AsyncClient(
                timeout=self.timeout_seconds,
                follow_redirects=True,
                headers={"User-Agent": "SpecForge/0.1 product-data resolver"},
            ) as client:
                response = await client.get(
                    "https://html.duckduckgo.com/html/", params={"q": query}
                )
                response.raise_for_status()
        except httpx.HTTPError:
            return None
        fragments = [
            html.unescape(_HTML_TAG.sub(" ", fragment))
            for fragment in _RESULT_TEXT.findall(response.text)
        ]
        evidence = " ".join(" ".join(fragment.split()) for fragment in fragments)
        if not evidence:
            return None
        evidence_key = entity_key(evidence)

        # A brand mention is stronger than a fuzzy organization-name hit because the
        # delivery-format pairs establish which manufacturer owns that brand.
        for brand in self.brands.entries:
            if brand.key and brand.key in evidence_key:
                manufacturer = self.brand_manufacturers.get(brand.key)
                if manufacturer:
                    return ManufacturerLookupResult(manufacturer, 0.95, str(response.url))

        ranked: list[tuple[float, str]] = []
        for manufacturer in self.manufacturers.entries:
            if manufacturer.key and manufacturer.key in evidence_key:
                score = 0.93
            else:
                score = fuzz.partial_ratio(manufacturer.key, evidence_key) / 100.0
            ranked.append((score, manufacturer.canonical_name))
        if not ranked:
            return None
        score, name = max(ranked)
        return (
            ManufacturerLookupResult(name, min(score, 0.93), str(response.url))
            if score >= 0.86
            else None
        )
