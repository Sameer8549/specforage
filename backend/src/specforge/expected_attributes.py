"""Expected-attribute patterns learned only from the supplied ground truth."""

import re
from collections import defaultdict
from dataclasses import dataclass

from rapidfuzz import fuzz, process

from specforge.data import DatasetInfo, iter_csv_rows


_ATTRIBUTE_LABEL = re.compile(r"^ATTRIBUTE_LABEL (\d+)$")


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
    def __init__(self, patterns: tuple[AttributePattern, ...]) -> None:
        self.patterns = patterns

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
            return []
        paths = [pattern.classpath for pattern in self.patterns]
        match = process.extractOne(
            classpath,
            paths,
            scorer=lambda query, choice, **_: category_similarity(query, choice),
        )
        if match is None or match[1] < minimum_score:
            return []
        return list(self.patterns[match[2]].attributes)
