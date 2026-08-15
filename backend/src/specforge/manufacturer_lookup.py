"""MPN web-search lookup used when catalog brand evidence is absent."""

import html
import re
from dataclasses import dataclass
from typing import Protocol
from urllib.parse import parse_qs, unquote, urlparse

import httpx
from rapidfuzz import fuzz

from specforge.vocabulary import EntityVocabulary, entity_key
from specforge.retrieval import RetrievedExcerpt, is_official_url, normalized_domain


_HTML_TAG = re.compile(r"<[^>]+>")
_RESULT_TEXT = re.compile(
    r'class="result__(?:title|snippet)[^"]*"[^>]*>(.*?)</(?:a|div)>',
    re.IGNORECASE | re.DOTALL,
)
_RESULT_LINK = re.compile(
    r'class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>',
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


class OfficialDomainResolver(Protocol):
    async def resolve(self, manufacturer: str) -> str | None: ...


def _result_url(raw_url: str) -> str:
    decoded = html.unescape(raw_url)
    parsed = urlparse(decoded)
    redirect = parse_qs(parsed.query).get("uddg")
    return unquote(redirect[0]) if redirect else decoded


def _search_links(document: str) -> list[tuple[str, str]]:
    return [
        (_result_url(url), " ".join(html.unescape(_HTML_TAG.sub(" ", title)).split()))
        for url, title in _RESULT_LINK.findall(document)
    ]


class WebOfficialDomainResolver:
    """Resolve a likely official domain from a targeted manufacturer-name search."""

    _BLOCKED_HOSTS = {
        "amazon.com",
        "facebook.com",
        "instagram.com",
        "linkedin.com",
        "wikipedia.org",
        "youtube.com",
    }

    def __init__(self, timeout_seconds: float = 8.0) -> None:
        self.timeout_seconds = timeout_seconds

    async def resolve(self, manufacturer: str) -> str | None:
        try:
            async with httpx.AsyncClient(
                timeout=self.timeout_seconds,
                follow_redirects=True,
                headers={"User-Agent": "SpecForge/0.1 product-data resolver"},
            ) as client:
                response = await client.get(
                    "https://html.duckduckgo.com/html/",
                    params={"q": f'"{manufacturer}" official site'},
                )
                response.raise_for_status()
        except httpx.HTTPError:
            return None
        manufacturer_tokens = set(entity_key(manufacturer).split())
        for url, title in _search_links(response.text):
            domain = normalized_domain(url)
            if not domain or any(
                domain == blocked or domain.endswith(f".{blocked}")
                for blocked in self._BLOCKED_HOSTS
            ):
                continue
            domain_tokens = set(re.split(r"[^a-z0-9]+", domain.casefold()))
            title_tokens = set(entity_key(title).split())
            distinctive = {
                token
                for token in manufacturer_tokens
                if token not in {"company", "corporation", "manufacturing"}
            }
            if distinctive & (domain_tokens | title_tokens):
                return domain
        return None


class WebManufacturerRetriever:
    """Retrieve official-domain search excerpts and page text for one MPN query."""

    def __init__(self, timeout_seconds: float = 10.0, max_results: int = 3) -> None:
        self.timeout_seconds = timeout_seconds
        self.max_results = max_results

    async def retrieve(self, domain: str, query: str) -> list[RetrievedExcerpt]:
        try:
            async with httpx.AsyncClient(
                timeout=self.timeout_seconds,
                follow_redirects=True,
                headers={"User-Agent": "SpecForge/0.1 product-data retriever"},
            ) as client:
                search = await client.get(
                    "https://html.duckduckgo.com/html/", params={"q": query}
                )
                search.raise_for_status()
                links = [
                    (url, title)
                    for url, title in _search_links(search.text)
                    if is_official_url(url, domain)
                ][: self.max_results]
                excerpts: list[RetrievedExcerpt] = []
                for url, title in links:
                    text = title
                    try:
                        page = await client.get(url)
                        page.raise_for_status()
                        page_text = html.unescape(_HTML_TAG.sub(" ", page.text))
                        text = " ".join(page_text.split())[:12000] or title
                    except httpx.HTTPError:
                        pass
                    if text:
                        excerpts.append(RetrievedExcerpt(url=url, text=text))
                return excerpts
        except httpx.HTTPError:
            return []


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
