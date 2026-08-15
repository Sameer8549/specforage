export interface AttributeItem {
  name: string;
  rawValue: string;
  normalizedValue: string;
  source: string;
  confidence: number;
  vocabState: "MATCHED" | "FIRST SEEN" | "FLAGGED";
  entailment: "ENTAILED" | "UNVERIFIED" | "CONFLICT";
}

export interface DescriptionVariant {
  type: "MOBILE" | "INVOICE" | "SHORT" | "LONG" | "RETAIL" | "MARKETING";
  limit: number;
  text: string;
}

export interface AdjudicationEntry {
  step: string;
  field: string;
  rawInput: string;
  resolvedValue: string;
  action: string;
  reason: string;
}

export interface ProductRecord {
  id: string;
  mpn: string;
  upc?: string;
  brand: string;
  brandInferred: boolean;
  manufacturer: string;
  canonicalManufacturer: string;
  unspscCode: string;
  unspscClasspath: string;
  segment: string;
  family: string;
  class: string;
  commodity: string;
  overallConfidence: number;
  coveragePercent: number;
  reviewStatus: "VERIFIED" | "REQUIRES REVIEW" | "REJECTED";
  flagCount: number;
  createdAt: string;
  attributes: AttributeItem[];
  descriptions: DescriptionVariant[];
  adjudicationLog: AdjudicationEntry[];
}
