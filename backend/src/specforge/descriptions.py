"""Description profiles and deterministic formatting learned from ground truth."""

from collections import Counter
from dataclasses import dataclass

from rapidfuzz import process

from specforge.contracts import AttributeValue
from specforge.data import DatasetInfo, iter_csv_rows
from specforge.expected_attributes import category_similarity
from specforge.normalization import format_measurement


DESCRIPTION_FIELDS = (
    "MOBILE_DESC",
    "INVOICE_DESC",
    "SHORT_DESC",
    "LONG_DESC1",
    "RETAIL_DESC",
    "MARKETING_DESCRIPTION",
)

# Attribute placement is the common ordered grammar visible in both supplied rows.
INVOICE_LABEL_ORDER = (
    "Mounting Type",
    "Number of Wash Cycles",
    "Material",
    "Color",
    "Voltage Rating",
    "Amperage Rating",
)
SHORT_LABEL_ORDER = (
    "Mounting Type",
    "Number of Wash Cycles",
    "Material",
    "Color",
)
LONG_LABEL_ORDER = (
    "Number of Wash Cycles",
    "Voltage Rating",
    "Amperage Rating",
    "Mounting Type",
    "Plug Type",
    "Size",
    "Depth With Door Open",
    "Minimum Height",
    "Maximum Height",
    "Sound Level",
    "Material",
    "Color",
    "Additional Information",
)
RETAIL_LABEL_ORDER = SHORT_LABEL_ORDER

# These compact tokens occur verbatim in the supplied invoice descriptions.
GROUND_TRUTH_ABBREVIATIONS = {
    "built-in": "BLTLN",
    "stainless steel": "SST",
}


@dataclass(frozen=True, slots=True)
class DescriptionLimits:
    mobile: int
    invoice: int
    short: int
    long: int
    retail: int
    marketing: int


@dataclass(frozen=True, slots=True)
class DescriptionProfile:
    classpath: str
    product_name: str


class DescriptionFormulaCatalog:
    def __init__(self, profiles: tuple[DescriptionProfile, ...], limits: DescriptionLimits) -> None:
        self.profiles = profiles
        self.limits = limits

    @classmethod
    def from_ground_truth(cls, info: DatasetInfo) -> "DescriptionFormulaCatalog":
        rows = list(iter_csv_rows(info))
        product_names: dict[str, Counter[str]] = {}
        for row in rows:
            classpath = row.get("Classpath", "").strip()
            product_name = row.get("Product Name", "").strip()
            if classpath and product_name:
                product_names.setdefault(classpath, Counter())[product_name] += 1
        profiles = tuple(
            DescriptionProfile(
                classpath=classpath,
                product_name=counts.most_common(1)[0][0],
            )
            for classpath, counts in sorted(product_names.items())
        )

        observed = {
            field: max((len(row.get(field, "")) for row in rows), default=0)
            for field in DESCRIPTION_FIELDS
        }
        limits = DescriptionLimits(
            mobile=80,
            invoice=40,
            short=observed["SHORT_DESC"],
            long=observed["LONG_DESC1"],
            retail=observed["RETAIL_DESC"],
            marketing=observed["MARKETING_DESCRIPTION"],
        )
        return cls(profiles, limits)

    def product_name_for(self, classpath: str | None) -> str | None:
        if not classpath or not self.profiles:
            return None
        paths = [profile.classpath for profile in self.profiles]
        match = process.extractOne(
            classpath,
            paths,
            scorer=lambda query, choice, **_: category_similarity(query, choice),
            score_cutoff=55,
        )
        return self.profiles[match[2]].product_name if match is not None else None


def compact_attribute(attribute: AttributeValue) -> str:
    if attribute.value is None:
        return ""
    mapped = GROUND_TRUTH_ABBREVIATIONS.get(attribute.value.casefold())
    if mapped:
        return mapped
    if attribute.label == "Number of Wash Cycles":
        return attribute.value
    return format_measurement(attribute.value, attribute.uom).replace(" ", "").upper()


def descriptive_attribute(attribute: AttributeValue, style: str) -> str:
    if attribute.value is None:
        return ""
    value = format_measurement(attribute.value, attribute.uom)
    label = attribute.label
    if label == "Series":
        return value
    if label == "Number of Wash Cycles":
        return f"{value}-Wash Cycle" if style in {"short", "retail"} else f"{value} Wash Cycles"
    if label == "Mounting Type":
        return f"{value} Mounting"
    if label in {"Material", "Color", "Size"}:
        return value
    if label == "Additional Information":
        return f"Additional Information: {value}"
    return f"{value} {label}"


def append_parts(parts: list[str], separator: str, limit: int) -> tuple[str, bool]:
    kept: list[str] = []
    truncated = False
    for part in (part.strip() for part in parts if part and part.strip()):
        candidate = separator.join((*kept, part))
        if len(candidate) <= limit:
            kept.append(part)
        else:
            truncated = True
    if kept:
        return separator.join(kept), truncated
    first = next((part.strip() for part in parts if part and part.strip()), "")
    return first[:limit].rstrip(), len(first) > limit
