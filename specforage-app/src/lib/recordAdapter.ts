import type { ProductRecord, AttributeItem, DescriptionVariant } from "@/data/sampleRecords";
import type { SpecForgeRecord, StageObject } from "@/lib/specforgeApi";

type AnyObject = Record<string, unknown>;

function object(value: unknown): AnyObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as AnyObject : {};
}

function text(value: unknown, fallback = "—"): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function number(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function attributes(record: SpecForgeRecord): AttributeItem[] {
  const normalized = object(record.normalize).attributes;
  const verified = Array.isArray(object(record.verify).results) ? object(record.verify).results as AnyObject[] : [];
  if (!Array.isArray(normalized)) return [];
  return normalized.map((raw) => {
    const attr = object(raw);
    const check = verified.find((item) => text(item.label, "") === text(attr.label, ""));
    const entailment = text(check?.entailment, "ambiguous");
    return {
      name: text(attr.label),
      rawValue: text(attr.value),
      normalizedValue: text(attr.value),
      source: text(attr.source_type, "UNRESOLVED").toUpperCase(),
      confidence: number(check?.confidence, number(attr.confidence)),
      vocabState: check?.vocabulary_compliant === false ? "FLAGGED" : "MATCHED",
      entailment: entailment === "supported" ? "ENTAILED" : entailment === "not_supported" ? "CONFLICT" : "UNVERIFIED",
    };
  });
}

export function toProductRecord(record: SpecForgeRecord): ProductRecord {
  const input = object(record.input);
  const resolution = object(record.brand_resolution);
  const manufacturer = object(resolution.manufacturer);
  const brand = object(resolution.brand);
  const classify = object(record.classify);
  const audit = object(record.audit);
  const descriptions = object(record.description);
  const path = text(classify.classpath, "Unclassified");
  const hierarchy = path.split(">").map((part) => part.trim());
  const descriptionFields: Array<[DescriptionVariant["type"], string, number]> = [
    ["MOBILE", "mobile_desc", 80], ["INVOICE", "invoice_desc", 40],
    ["SHORT", "short_desc", 80], ["LONG", "long_desc1", 200],
    ["RETAIL", "retail_desc", 150], ["MARKETING", "marketing_description", 500],
  ];
  const flags = Array.isArray(audit.flags) ? audit.flags : [];
  return {
    id: record.item_id,
    mpn: text(input.mfg_part_num),
    upc: text(object(record.output_row).values && object(object(record.output_row).values).UPC, "") || undefined,
    brand: text(brand.canonical_name),
    brandInferred: text(resolution.manufacturer_source, "") === "brand_pairing",
    manufacturer: text(input.part_manuf),
    canonicalManufacturer: text(manufacturer.canonical_name),
    unspscCode: text(classify.unspsc_code),
    unspscClasspath: path.replaceAll(">", " → "),
    segment: hierarchy[0] ?? "Unclassified",
    family: hierarchy[1] ?? "Unclassified",
    class: hierarchy[2] ?? "Unclassified",
    commodity: `${text(classify.unspsc_code)} — ${hierarchy[3] ?? hierarchy.at(-1) ?? "Unclassified"}`,
    overallConfidence: number(classify.confidence),
    coveragePercent: number(audit.coverage_percent),
    reviewStatus: audit.routed_to_review ? "REQUIRES REVIEW" : "VERIFIED",
    flagCount: flags.length,
    createdAt: record.created_at,
    attributes: attributes(record),
    descriptions: descriptionFields.map(([type, key, limit]) => ({ type, limit, text: text(descriptions[key], "") })),
    adjudicationLog: Array.isArray(object(record.adjudicate).reasoning)
      ? (object(record.adjudicate).reasoning as unknown[]).map((reason, index) => ({
          step: String(index + 1).padStart(2, "0"), field: "CONFLICT",
          rawInput: "—", resolvedValue: "—", action: "ADJUDICATE", reason: text(reason),
        }))
      : [],
  };
}

export function readProcessedRecord(): SpecForgeRecord | null {
  try {
    const raw = sessionStorage.getItem("sf_processed_record");
    return raw ? JSON.parse(raw) as SpecForgeRecord : null;
  } catch {
    return null;
  }
}
