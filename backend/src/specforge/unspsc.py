"""UNSPSC taxonomy loading and compact BGE-small embedding search."""

import csv
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Protocol, Sequence

import numpy as np
from rapidfuzz import fuzz, process


UNSPSC_HEADERS = (
    "Segment",
    "Segment Name",
    "Family",
    "Family Name",
    "Class",
    "Class Name",
    "Commodity",
    "Commodity Name",
)


class UNSPSCValidationError(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class UNSPSCRecord:
    segment_code: str
    segment_name: str
    family_code: str
    family_name: str
    class_code: str
    class_name: str
    commodity_code: str
    commodity_name: str

    @property
    def classpath(self) -> str:
        return ">".join(
            (self.segment_name, self.family_name, self.class_name, self.commodity_name)
        )

    @property
    def embedding_text(self) -> str:
        return " | ".join(
            (self.commodity_name, self.class_name, self.family_name, self.segment_name)
        )


@dataclass(frozen=True, slots=True)
class UNSPSCClassGroup:
    class_code: str
    class_name: str
    family_name: str
    segment_name: str
    commodities: tuple[UNSPSCRecord, ...]

    @property
    def embedding_text(self) -> str:
        return " | ".join((self.class_name, self.family_name, self.segment_name))


_WORDS = re.compile(r"[a-z0-9]+")


def _commodity_score(query: str, choice: str, **_: object) -> float:
    """Favor same-prefix product nouns (dishwasher→dishwashing, not washer)."""

    query_tokens = [token for token in _WORDS.findall(query.casefold()) if len(token) >= 4]
    choice_tokens = [token for token in _WORDS.findall(choice.casefold()) if len(token) >= 4]
    scores = [
        fuzz.ratio(query_token, choice_token)
        for query_token in query_tokens
        for choice_token in choice_tokens
        if query_token[:4] == choice_token[:4]
    ]
    return max(scores, default=0.0)


def _choice_token_coverage_score(query: str, choice: str, **_: object) -> float:
    """Reward commodity phrases whose meaningful tokens are all present in the query."""

    query_tokens = [token for token in _WORDS.findall(query.casefold()) if len(token) >= 3]
    choice_tokens = [token for token in _WORDS.findall(choice.casefold()) if len(token) >= 3]
    if not choice_tokens:
        return 0.0
    matched = sum(
        any(
            query_token == choice_token
            or (
                len(query_token) >= 4
                and len(choice_token) >= 4
                and query_token[:4] == choice_token[:4]
            )
            for query_token in query_tokens
        )
        for choice_token in choice_tokens
    )
    return 100.0 * matched / len(choice_tokens)


class EmbeddingBackend(Protocol):
    def embed(self, texts: Sequence[str]) -> np.ndarray: ...


class FastEmbedBackend:
    """Lazy ONNX backend; model memory is paid only by the Classify stage."""

    def __init__(self, model_name: str) -> None:
        self.model_name = model_name
        self._model: object | None = None

    def embed(self, texts: Sequence[str]) -> np.ndarray:
        if self._model is None:
            from fastembed import TextEmbedding

            self._model = TextEmbedding(model_name=self.model_name, threads=1)
        vectors = list(self._model.embed(list(texts)))  # type: ignore[attr-defined]
        matrix = np.asarray(vectors, dtype=np.float32)
        norms = np.linalg.norm(matrix, axis=1, keepdims=True)
        return matrix / np.maximum(norms, 1e-12)


def iter_unspsc(path: Path) -> Iterable[UNSPSCRecord]:
    # The government export is Windows-1252 (it contains accented commodity names).
    with path.open("r", encoding="cp1252", newline="") as handle:
        reader = csv.DictReader(handle)
        if tuple(reader.fieldnames or ()) != UNSPSC_HEADERS:
            raise UNSPSCValidationError(
                f"UNSPSC headers must exactly match {UNSPSC_HEADERS}; got {reader.fieldnames}"
            )
        seen: set[str] = set()
        for row_number, row in enumerate(reader, start=2):
            code = row["Commodity"].strip()
            if len(code) != 8 or not code.isdigit():
                raise UNSPSCValidationError(f"Invalid commodity code at row {row_number}: {code!r}")
            if code in seen:
                raise UNSPSCValidationError(f"Duplicate commodity code at row {row_number}: {code}")
            seen.add(code)
            yield UNSPSCRecord(
                segment_code=row["Segment"].strip(),
                segment_name=row["Segment Name"].strip(),
                family_code=row["Family"].strip(),
                family_name=row["Family Name"].strip(),
                class_code=row["Class"].strip(),
                class_name=row["Class Name"].strip(),
                commodity_code=code,
                commodity_name=row["Commodity Name"].strip(),
            )


def group_unspsc(records: Sequence[UNSPSCRecord]) -> tuple[UNSPSCClassGroup, ...]:
    grouped: dict[str, list[UNSPSCRecord]] = {}
    for record in records:
        grouped.setdefault(record.class_code, []).append(record)
    return tuple(
        UNSPSCClassGroup(
            class_code=commodities[0].class_code,
            class_name=commodities[0].class_name,
            family_name=commodities[0].family_name,
            segment_name=commodities[0].segment_name,
            commodities=tuple(commodities),
        )
        for _, commodities in sorted(grouped.items())
    )


class UNSPSCIndex:
    def __init__(
        self,
        records: Sequence[UNSPSCRecord],
        embeddings: np.ndarray,
        embedder: EmbeddingBackend,
    ) -> None:
        self.records = tuple(records)
        self.groups = group_unspsc(self.records)
        if embeddings.ndim != 2 or embeddings.shape[0] != len(self.groups):
            raise UNSPSCValidationError(
                f"Embedding shape {embeddings.shape} does not match {len(self.groups)} UNSPSC classes"
            )
        self.embeddings = embeddings
        self.embedder = embedder
        self._commodity_names = tuple(record.commodity_name for record in self.records)
        self._class_index = {
            group.class_code: index for index, group in enumerate(self.groups)
        }

    @classmethod
    def load(
        cls, taxonomy_path: Path, embeddings_path: Path, embedder: EmbeddingBackend
    ) -> "UNSPSCIndex":
        records = tuple(iter_unspsc(taxonomy_path))
        if not embeddings_path.is_file():
            raise UNSPSCValidationError(
                f"Embedding index not found: {embeddings_path}. Run scripts/build_unspsc_index.py."
            )
        embeddings = np.load(embeddings_path, mmap_mode="r")
        return cls(records, embeddings, embedder)

    def search(self, query: str, limit: int = 3) -> list[tuple[UNSPSCRecord, float]]:
        query_vector = self.embedder.embed([query])[0].astype(np.float32, copy=False)
        matrix = np.asarray(self.embeddings, dtype=np.float32)
        class_scores = matrix @ query_vector
        # A narrow class gate can hide the correct commodity even though all 71,502
        # commodities are loaded (for example, "miter saw" behind a weak power-tools
        # class embedding). Keep a broad semantic class pool within the same compact
        # 5,313-class index, then let commodity evidence perform the final ranking.
        class_count = min(128, class_scores.size)
        top_classes = np.argpartition(class_scores, -class_count)[-class_count:]

        commodity_pool: dict[str, tuple[UNSPSCRecord, float]] = {}
        for class_index in top_classes:
            group = self.groups[int(class_index)]
            choices = [record.commodity_name for record in group.commodities]
            lexical = process.extract(query, choices, scorer=_commodity_score, limit=limit)
            for _, lexical_score, commodity_index in lexical:
                # Embeddings select the semantic class; lexical evidence resolves its commodity.
                combined = 0.8 * float(class_scores[class_index]) + 0.2 * (lexical_score / 100.0)
                record = group.commodities[commodity_index]
                commodity_pool[record.commodity_code] = (record, combined)

        # Global lexical retrieval makes concrete commodity nouns available even when a broad
        # class embedding is ambiguous (for example, dishwasher vs mechanical washers).
        lexical_limit = max(50, limit * 5)
        prefix_global = process.extract(
            query,
            self._commodity_names,
            scorer=_commodity_score,
            limit=lexical_limit,
        )
        phrase_global = process.extract(
            query,
            self._commodity_names,
            scorer=_choice_token_coverage_score,
            limit=lexical_limit,
        )
        for _, lexical_score, record_index in prefix_global:
            if lexical_score <= 0:
                continue
            record = self.records[record_index]
            class_score = float(class_scores[self._class_index[record.class_code]])
            lexical_confidence = lexical_score / 100.0
            combined = 0.7 * class_score + 0.3 * lexical_confidence
            current = commodity_pool.get(record.commodity_code)
            if current is None or combined > current[1]:
                commodity_pool[record.commodity_code] = (record, combined)
        for _, lexical_score, record_index in phrase_global:
            if lexical_score <= 0:
                continue
            record = self.records[record_index]
            class_score = float(class_scores[self._class_index[record.class_code]])
            lexical_confidence = lexical_score / 100.0
            combined = max(
                0.7 * class_score + 0.3 * lexical_confidence,
                0.85 * lexical_confidence,
            )
            current = commodity_pool.get(record.commodity_code)
            if current is None or combined > current[1]:
                commodity_pool[record.commodity_code] = (record, combined)

        ranked = sorted(commodity_pool.values(), key=lambda item: item[1], reverse=True)
        return ranked[:limit]
