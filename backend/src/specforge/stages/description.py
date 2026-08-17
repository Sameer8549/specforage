"""Pure deterministic description construction with learned field limits."""

from datetime import datetime, timezone

from specforge.contracts import DescriptionStage, ItemRecord, ReviewFlag
from specforge.descriptions import (
    INVOICE_LABEL_ORDER,
    LONG_LABEL_ORDER,
    RETAIL_LABEL_ORDER,
    SHORT_LABEL_ORDER,
    DescriptionFormulaCatalog,
    append_parts,
    compact_attribute,
    descriptive_attribute,
)
from specforge.vocabulary import entity_key


def run_description_stage(
    record: ItemRecord,
    catalog: DescriptionFormulaCatalog,
) -> ItemRecord:
    flags: list[ReviewFlag] = []
    limits = catalog.limits
    classpath = record.classify.classpath if record.classify is not None else None
    product_name = catalog.product_name_for(classpath)
    if product_name is None and classpath:
        product_name = classpath.rsplit(">", 1)[-1].strip() or None
    if product_name is None:
        flags.append(
            ReviewFlag(
                code="description_missing_product_name",
                message="No ground-truth-compatible product name or classpath was available.",
                field="Product Name",
                stage="description",
            )
        )

    attributes = record.adjudicate.attributes if record.adjudicate is not None else []
    by_label = {attribute.label: attribute for attribute in attributes if attribute.value is not None}
    series = by_label.get("Series")
    series_value = series.value if series else None
    source = record.clean or record.input
    mpn = source.mfg_part_num
    resolution = record.brand_resolution
    brand = resolution.brand.canonical_name if resolution is not None else None
    manufacturer = resolution.manufacturer.canonical_name if resolution is not None else None

    identity = brand or manufacturer
    if manufacturer and brand and entity_key(manufacturer) != entity_key(brand):
        identity = f"{manufacturer} {brand}"

    mobile_parts = [identity, product_name, series_value, mpn]
    mounting = by_label.get("Mounting Type")
    if mounting:
        mobile_parts.append(descriptive_attribute(mounting, "mobile"))
    mobile, mobile_truncated = append_parts(mobile_parts, ", ", limits.mobile)

    invoice_attributes = [
        by_label[label] for label in INVOICE_LABEL_ORDER if label in by_label
    ]
    # The supplied rows use depth when cycle count is present, otherwise sound level.
    invoice_tail = (
        by_label.get("Depth With Door Open")
        if "Number of Wash Cycles" in by_label
        else by_label.get("Sound Level")
    )
    if invoice_tail is not None:
        invoice_attributes.append(invoice_tail)
    invoice_parts = [product_name.upper() if product_name else ""] + [
        compact_attribute(attribute) for attribute in invoice_attributes
    ]
    invoice, invoice_truncated = append_parts(invoice_parts, " ", limits.invoice)

    short_prefix = " ".join(
        part for part in (brand, series_value, mpn, product_name) if part
    )
    short_suffix = [
        descriptive_attribute(by_label[label], "short")
        for label in SHORT_LABEL_ORDER
        if label in by_label
    ]
    short, short_truncated = append_parts([short_prefix, *short_suffix], ", ", limits.short)

    long_prefix = " ".join(part for part in (brand, product_name) if part)
    long_parts = [long_prefix]
    if series_value:
        long_parts.append(series_value)
    long_parts.extend(
        descriptive_attribute(by_label[label], "long")
        for label in LONG_LABEL_ORDER
        if label in by_label
    )
    long_desc, long_truncated = append_parts(long_parts, ", ", limits.long)

    retail_prefix = " ".join(part for part in (series_value, product_name) if part)
    retail_parts = [retail_prefix]
    retail_parts.extend(
        descriptive_attribute(by_label[label], "retail")
        for label in RETAIL_LABEL_ORDER
        if label in by_label
    )
    retail, retail_truncated = append_parts(retail_parts, ", ", limits.retail)

    for field, truncated in (
        ("MOBILE_DESC", mobile_truncated),
        ("INVOICE_DESC", invoice_truncated),
        ("SHORT_DESC", short_truncated),
        ("LONG_DESC1", long_truncated),
        ("RETAIL_DESC", retail_truncated),
    ):
        if truncated:
            flags.append(
                ReviewFlag(
                    code="description_truncated",
                    message=f"{field} omitted lower-priority components to meet its learned limit.",
                    field=field,
                    stage="description",
                )
            )
    if mobile and len(mobile) < 60:
        flags.append(
            ReviewFlag(
                code="mobile_description_below_target",
                message="MOBILE_DESC is below the observed 60-character target; it was not padded.",
                field="MOBILE_DESC",
                stage="description",
            )
        )

    compliant = (
        60 <= len(mobile) <= limits.mobile
        and len(invoice) <= limits.invoice
        and len(short) <= limits.short
        and len(long_desc) <= limits.long
        and len(retail) <= limits.retail
    )
    field_compliance = {
        "MOBILE_DESC": bool(mobile) and 60 <= len(mobile) <= limits.mobile,
        "INVOICE_DESC": bool(invoice) and len(invoice) <= limits.invoice,
        "SHORT_DESC": bool(short) and len(short) <= limits.short,
        "LONG_DESC1": bool(long_desc) and len(long_desc) <= limits.long,
        "RETAIL_DESC": bool(retail) and len(retail) <= limits.retail,
        "MARKETING_DESCRIPTION": False,
    }
    return record.model_copy(
        update={
            "description": DescriptionStage(
                product_name=product_name,
                mobile_desc=mobile or None,
                invoice_desc=invoice or None,
                short_desc=short or None,
                long_desc1=long_desc or None,
                retail_desc=retail or None,
                marketing_description=None,
                character_limit_compliant=compliant,
                field_compliance=field_compliance,
                flags=flags,
            ),
            "updated_at": datetime.now(timezone.utc),
        },
        deep=True,
    )
