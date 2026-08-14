"""Contracts and guards for manufacturer-owned source retrieval."""

from dataclasses import dataclass
from typing import Protocol
from urllib.parse import urlparse


@dataclass(frozen=True, slots=True)
class RetrievedExcerpt:
    url: str
    text: str


class ManufacturerRetriever(Protocol):
    async def retrieve(self, domain: str, query: str) -> list[RetrievedExcerpt]: ...


def normalized_domain(value: str) -> str | None:
    parsed = urlparse(value if "://" in value else f"https://{value}")
    host = (parsed.hostname or "").casefold().rstrip(".")
    return host.removeprefix("www.") or None


def is_official_url(url: str, manufacturer_domain: str) -> bool:
    allowed = normalized_domain(manufacturer_domain)
    host = normalized_domain(url)
    return bool(allowed and host and (host == allowed or host.endswith(f".{allowed}")))
