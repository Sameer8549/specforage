"""MPN web-search lookup used when catalog brand evidence is absent."""

import asyncio
from contextvars import ContextVar
import html
import json
import re
from dataclasses import dataclass
from pathlib import Path
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


def manufacturer_retrieval_queries(domain: str, query: str) -> tuple[str, ...]:
    """Broaden a site-restricted MPN query without relaxing its URL allowlist."""
    queries = [query]
    site_prefix = f"site:{normalized_domain(domain)} "
    if query.casefold().startswith(site_prefix.casefold()):
        mpn = query[len(site_prefix) :].strip()
        if mpn:
            queries.append(f'"{mpn}"')
    return tuple(queries)


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
                links: list[tuple[str, str]] = []
                seen_urls: set[str] = set()
                for search_query in manufacturer_retrieval_queries(domain, query):
                    search = await client.get(
                        "https://html.duckduckgo.com/html/",
                        params={"q": search_query},
                    )
                    search.raise_for_status()
                    for url, title in _search_links(search.text):
                        if url not in seen_urls and is_official_url(url, domain):
                            links.append((url, title))
                            seen_urls.add(url)
                            if len(links) >= self.max_results:
                                break
                    if links:
                        break
                excerpts: list[RetrievedExcerpt] = []
                for url, title in links[: self.max_results]:
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
        cache_path: Path | None = None,
    ) -> None:
        self.manufacturers = manufacturers
        self.brands = brands
        self.brand_manufacturers = brand_manufacturers
        self.timeout_seconds = timeout_seconds
        self.cache_path = cache_path
        self._cache = self._load_cache()
        self._cache_lock = asyncio.Lock()
        self._last_cache_hit: ContextVar[bool | None] = ContextVar(
            "manufacturer_lookup_cache_hit", default=None
        )

    @property
    def last_cache_hit(self) -> bool | None:
        """Cache status for the current async request context."""
        return self._last_cache_hit.get()

    @staticmethod
    def _cache_key(mfg_part_num: str) -> str:
        return re.sub(r"[^a-z0-9]+", "", mfg_part_num.casefold())

    def _load_cache(self) -> dict[str, ManufacturerLookupResult | None]:
        if self.cache_path is None or not self.cache_path.is_file():
            return {}
        try:
            payload = json.loads(self.cache_path.read_text(encoding="utf-8"))
            if not isinstance(payload, dict):
                return {}
            loaded: dict[str, ManufacturerLookupResult | None] = {}
            for key, value in payload.items():
                if not isinstance(key, str):
                    continue
                if value is None:
                    loaded[key] = None
                elif isinstance(value, dict) and isinstance(value.get("manufacturer"), str):
                    loaded[key] = ManufacturerLookupResult(
                        manufacturer=value["manufacturer"],
                        confidence=float(value.get("confidence", 0.0)),
                        source_url=value.get("source_url"),
                    )
            return loaded
        except (OSError, ValueError, TypeError):
            return {}

    def _persist_cache(self) -> None:
        if self.cache_path is None:
            return
        payload = {
            key: (
                {
                    "manufacturer": value.manufacturer,
                    "confidence": value.confidence,
                    "source_url": value.source_url,
                }
                if value is not None
                else None
            )
            for key, value in sorted(self._cache.items())
        }
        self.cache_path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.cache_path.with_suffix(f"{self.cache_path.suffix}.tmp")
        temporary.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary.replace(self.cache_path)

    async def _lookup_uncached(
        self, mfg_part_num: str, part_desc: str | None
    ) -> ManufacturerLookupResult | None:
        """Perform one live lookup. Callers should normally use ``lookup``."""
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
        return self._resolve_response(response)

    def _resolve_response(
        self, response: httpx.Response
    ) -> ManufacturerLookupResult | None:
        """Resolve a manufacturer from deterministic search-response evidence."""
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

    async def lookup(
        self, mfg_part_num: str, part_desc: str | None
    ) -> ManufacturerLookupResult | None:
        key = self._cache_key(mfg_part_num)
        if not key:
            self._last_cache_hit.set(None)
            return None
        if key in self._cache:
            self._last_cache_hit.set(True)
            return self._cache[key]
        # Serialize cache misses so concurrent requests for one MPN cannot race and
        # commit different live-search answers to the same pipeline instance.
        async with self._cache_lock:
            if key in self._cache:
                self._last_cache_hit.set(True)
                return self._cache[key]
            self._last_cache_hit.set(False)
            result = await self._lookup_uncached(mfg_part_num, part_desc)
            self._cache[key] = result
            try:
                self._persist_cache()
            except OSError:
                # Persistence failure must not make manufacturer resolution fail.
                pass
            return result
