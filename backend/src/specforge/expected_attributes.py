"""Expected-attribute patterns learned only from the supplied ground truth."""

import re
import csv
from collections import defaultdict
from dataclasses import dataclass

from rapidfuzz import fuzz, process

from specforge.data import DatasetInfo, iter_csv_rows


_ATTRIBUTE_LABEL = re.compile(r"^ATTRIBUTE_LABEL (\d+)$")
GENERIC_EXPECTED_ATTRIBUTES = (
    "Series",
    "Model",
    "Material",
    "Color",
    "Dimensions",
    "Weight",
    "Voltage Rating",
    "Power Rating",
    "Certification/Compliance",
)


def category_similarity(query: str, choice: str) -> float:
    query_leaf = query.rsplit(">", 1)[-1]
    choice_leaf = choice.rsplit(">", 1)[-1]
    return max(
        fuzz.WRatio(query, choice),
        fuzz.WRatio(query_leaf, choice_leaf),
        fuzz.partial_ratio(query_leaf, choice_leaf),
    )


@dataclass(frozen=True, slots=True)
class AttributePattern:
    classpath: str
    attributes: tuple[str, ...]


class ExpectedAttributeCatalog:
    def __init__(self, patterns: tuple[AttributePattern, ...], lovs: dict[tuple[str, str], tuple[str, ...]] | None = None) -> None:
        self.patterns = patterns
        self.lovs = lovs or {}

    @classmethod
    def from_lov_csv(cls, path) -> "ExpectedAttributeCatalog":
        by_classpath: dict[str, list[str]] = defaultdict(list)
        values: dict[tuple[str, str], list[str]] = defaultdict(list)
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            fields = {field.strip().casefold().replace(" ", "_"): field for field in (reader.fieldnames or [])}
            def required(*aliases: str) -> str:
                for alias in aliases:
                    if alias in fields:
                        return fields[alias]
                raise ValueError(f"Official LOV file is missing a required column; expected one of {aliases}.")
            path_column = required("classpath", "category_path", "category")
            label_column = required("attribute", "attribute_name", "label")
            value_column = required("value", "lov_value", "canonical_value")
            for row in reader:
                classpath = (row.get(path_column) or "").strip()
                label = (row.get(label_column) or "").strip()
                value = (row.get(value_column) or "").strip()
                if not classpath or not label:
                    continue
                if label not in by_classpath[classpath]:
                    by_classpath[classpath].append(label)
                if value and value not in values[(classpath, label)]:
                    values[(classpath, label)].append(value)
        if not by_classpath:
            raise ValueError("Official LOV file contains no usable classpath/attribute rows.")
        return cls(
            tuple(AttributePattern(path, tuple(labels)) for path, labels in sorted(by_classpath.items())),
            {key: tuple(items) for key, items in values.items()},
        )

    @classmethod
    def from_ground_truth(cls, info: DatasetInfo) -> "ExpectedAttributeCatalog":
        by_classpath: dict[str, list[str]] = defaultdict(list)
        label_columns = sorted(
            (
                (int(match.group(1)), header)
                for header in info.headers
                if (match := _ATTRIBUTE_LABEL.match(header))
            )
        )
        for row in iter_csv_rows(info):
            classpath = row.get("Classpath", "").strip()
            if not classpath:
                continue
            for _, column in label_columns:
                label = row.get(column, "").strip()
                if label and label not in by_classpath[classpath]:
                    by_classpath[classpath].append(label)
        return cls(
            tuple(
                AttributePattern(classpath=path, attributes=tuple(attributes))
                for path, attributes in sorted(by_classpath.items())
            )
        )

    def for_classification(self, classpath: str, minimum_score: float = 55.0) -> list[str]:
        if not self.patterns:
            return list(GENERIC_EXPECTED_ATTRIBUTES)
        paths = [pattern.classpath for pattern in self.patterns]
        match = process.extractOne(
            classpath,
            paths,
            scorer=lambda query, choice, **_: category_similarity(query, choice),
        )
        if match is None or match[1] < minimum_score:
            return list(GENERIC_EXPECTED_ATTRIBUTES)
        return list(self.patterns[match[2]].attributes)

    def applicable_lovs(self, classpath: str) -> dict[str, list[str]]:
        return {
            label: list(values)
            for (path, label), values in self.lovs.items()
            if path == classpath
        }
