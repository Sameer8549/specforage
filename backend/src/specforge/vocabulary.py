"""Small, self-derived entity vocabularies backed by RapidFuzz."""

import re
from collections import Counter
from dataclasses import dataclass
from typing import Iterable

from rapidfuzz import fuzz, process

from specforge.stages.clean import clean_optional, clean_text


_VENDOR_CODE = re.compile(r"\s*\([^()]+\)\s*$")
_PUNCTUATION = re.compile(r"[^a-z0-9]+")
_LEGAL_SUFFIXES = frozenset(
    {
        "co",
        "company",
        "corp",
        "corporation",
        "inc",
        "incorporated",
        "llc",
        "ltd",
        "limited",
        "plc",
    }
)


def display_name(value: str) -> str:
    """Remove dataset vendor identifiers while retaining the sourced organization name."""

    return _VENDOR_CODE.sub("", clean_text(value) or "").strip()


def entity_key(value: str) -> str:
    """Create a comparison-only key; the original sourced spelling remains canonical."""

    text = display_name(value).casefold().replace("&", " and ")
    tokens = [token for token in _PUNCTUATION.sub(" ", text).split() if token]
    while tokens and tokens[-1] in _LEGAL_SUFFIXES:
        tokens.pop()
    return " ".join(tokens)


@dataclass(frozen=True, slots=True)
class VocabularyEntry:
    canonical_name: str
    key: str
    frequency: int
    aliases: tuple[str, ...]


class EntityVocabulary:
    """Compact vocabulary that can be rebuilt as new observed values are added."""

    def __init__(self, values: Iterable[str] = (), cluster_threshold: float = 96.0) -> None:
        self.cluster_threshold = cluster_threshold
        self._observations: Counter[str] = Counter()
        self.entries: tuple[VocabularyEntry, ...] = ()
        self.extend(values)

    def extend(self, values: Iterable[str]) -> None:
        changed = False
        for value in values:
            cleaned = clean_optional(value)
            if cleaned is not None and entity_key(cleaned):
                self._observations[cleaned] += 1
                changed = True
        if changed:
            self._rebuild()

    def _rebuild(self) -> None:
        clusters: list[Counter[str]] = []
        cluster_keys: list[str] = []
        ordered = sorted(self._observations.items(), key=lambda item: (-item[1], item[0].casefold()))
        for alias, count in ordered:
            key = entity_key(alias)
            match = process.extractOne(key, cluster_keys, scorer=fuzz.ratio, score_cutoff=self.cluster_threshold)
            if match is None:
                clusters.append(Counter({alias: count}))
                cluster_keys.append(key)
            else:
                clusters[match[2]][alias] += count

        entries: list[VocabularyEntry] = []
        for aliases, key in zip(clusters, cluster_keys, strict=True):
            canonical_alias, _ = min(
                aliases.items(),
                key=lambda item: (-item[1], len(display_name(item[0])), display_name(item[0]).casefold()),
            )
            entries.append(
                VocabularyEntry(
                    canonical_name=display_name(canonical_alias),
                    key=key,
                    frequency=sum(aliases.values()),
                    aliases=tuple(sorted(aliases, key=str.casefold)),
                )
            )
        self.entries = tuple(sorted(entries, key=lambda entry: entry.canonical_name.casefold()))

    def rank(self, value: str, limit: int = 3) -> list[tuple[VocabularyEntry, float]]:
        query = entity_key(value)
        if not query or not self.entries:
            return []
        keys = [entry.key for entry in self.entries]
        matches = process.extract(query, keys, scorer=fuzz.WRatio, limit=limit)
        return [(self.entries[index], score / 100.0) for _, score, index in matches]
