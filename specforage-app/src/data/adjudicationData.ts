export type ConflictSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AdjudicationState = "RESOLVED_AUTO" | "REQUIRES_HUMAN" | "OVERRIDDEN";

export interface ConflictCase {
  id: string;
  mpn: string;
  field: string;
  conflictType:
    | "NUMERICAL_DISCREPANCY"
    | "PLACEHOLDER_CONTAMINATION"
    | "INFERRED_HIERARCHY"
    | "UOM_CONVERSION"
    | "MISSING_EVIDENCE";
  severity: ConflictSeverity;
  state: AdjudicationState;
  sourceA: {
    origin: string;
    rawValue: string;
    confidence: number;
  };
  sourceB: {
    origin: string;
    rawValue: string;
    confidence: number;
  };
  taxonomyConstraint: string;
  algorithmDecision: string;
  algorithmRule: string;
  auditTrail: string[];
  resolvedValue: string;
  governorNotes?: string;
}

export interface AdjudicationRule {
  id: string;
  ruleCode: string;
  targetField: string;
  priorityOrder: string[];
  toleranceBound: string;
  fallbackAction: string;
}

export const ADJUDICATION_RULES: AdjudicationRule[] = [
  {
    id: "RULE-01",
    ruleCode: "ADJ_MFR_AUTHORITY_FIRST",
    targetField: "FINISH / SPECS",
    priorityOrder: ["1. MFR PDF Spec Sheet", "2. MFR HTML", "3. Raw Description"],
    toleranceBound: "Exact string or approved synonym",
    fallbackAction: "Flag for human review if mfr domain unverified",
  },
  {
    id: "RULE-02",
    ruleCode: "ADJ_UOM_CANONICAL_STANDARDIZATION",
    targetField: "ALL NUMERIC / UOM",
    priorityOrder: ["1. Standardized SI / Imperial table", "2. Taxonomy schema"],
    toleranceBound: "+/- 0.5% conversion rounding",
    fallbackAction: "Convert to primary canonical UOM with space separation",
  },
  {
    id: "RULE-03",
    ruleCode: "ADJ_PLACEHOLDER_ZERO_TOLERANCE",
    targetField: "BRAND / MANUFACTURER",
    priorityOrder: ["1. Canonical registry", "2. Inferred parent", "3. Null"],
    toleranceBound: "Regex match on placeholder blacklist",
    fallbackAction: "Strip string immediately; set to null or infer from canonical mfr",
  },
  {
    id: "RULE-04",
    ruleCode: "ADJ_NUMERIC_TOLERANCE_BOUND",
    targetField: "NOISE LEVEL / DIMENSIONS",
    priorityOrder: ["1. UNSPSC Class Range", "2. MFR Specification Table"],
    toleranceBound: "Within standard commodity tolerance range",
    fallbackAction: "Accept high-confidence source; log discrepancy",
  },
];

export const CONFLICT_CASES: ConflictCase[] = [
  {
    id: "CR-201",
    mpn: "FGID2466QF4A",
    field: "BRAND",
    conflictType: "PLACEHOLDER_CONTAMINATION",
    severity: "HIGH",
    state: "RESOLVED_AUTO",
    sourceA: {
      origin: "RAW_CATALOG_ROW (Brand Field)",
      rawValue: "-- No Unilog Brand --",
      confidence: 0.1,
    },
    sourceB: {
      origin: "CANONICAL MFR RESOLVER (Frigidaire Company)",
      rawValue: "Frigidaire",
      confidence: 0.88,
    },
    taxonomyConstraint: "Brand must match registered trademark of canonical manufacturer",
    algorithmDecision: "Strip placeholder value; infer 'Frigidaire' from canonical manufacturer",
    algorithmRule: "ADJ_PLACEHOLDER_ZERO_TOLERANCE",
    auditTrail: [
      "Detected blacklisted prefix '-- ' matching placeholder pattern",
      "Discarded raw brand token '-- No Unilog Brand --'",
      "Queried canonical manufacturer registry for 'Frigidare' -> 'Frigidaire Company'",
      "Assigned single-brand inference 'Frigidaire' with 0.88 confidence flag",
    ],
    resolvedValue: "Frigidaire",
  },
  {
    id: "CR-202",
    mpn: "PF-90-SS-075",
    field: "MAX WORKING PRESSURE",
    conflictType: "UOM_CONVERSION",
    severity: "MEDIUM",
    state: "RESOLVED_AUTO",
    sourceA: {
      origin: "RAW_DESCRIPTION ('5100 psig')",
      rawValue: "5100 psig",
      confidence: 0.96,
    },
    sourceB: {
      origin: "MFR SPEC PDF ('Rating @ 100°F: 5100 psig / 351 bar')",
      rawValue: "351 bar",
      confidence: 0.99,
    },
    taxonomyConstraint: "UNSPSC 40141720 requires pressure in integer PSI",
    algorithmDecision: "Normalize gauge pressure 'psig' to standard canonical 'psi'",
    algorithmRule: "ADJ_UOM_CANONICAL_STANDARDIZATION",
    auditTrail: [
      "Identified gauge pressure notation 'psig'",
      "Cross-referenced against MFR PDF (confirmed 5100 psig = 351 bar)",
      "Standardized unit to approved canonical UOM 'psi'",
    ],
    resolvedValue: "5100 psi",
  },
  {
    id: "CR-203",
    mpn: "QO120",
    field: "VOLTAGE RATING",
    conflictType: "NUMERICAL_DISCREPANCY",
    severity: "LOW",
    state: "RESOLVED_AUTO",
    sourceA: {
      origin: "RAW_DESCRIPTION ('120V')",
      rawValue: "120V",
      confidence: 0.94,
    },
    sourceB: {
      origin: "MFR OFFICIAL SPEC ('120/240 V AC 50/60 Hz')",
      rawValue: "120/240 VAC",
      confidence: 0.99,
    },
    taxonomyConstraint: "UNSPSC 39121603 allows dual-rating 120/240 VAC",
    algorithmDecision: "Accept authoritative manufacturer dual-voltage rating 120/240 VAC",
    algorithmRule: "ADJ_MFR_AUTHORITY_FIRST",
    auditTrail: [
      "Raw distributor row truncated dual voltage to single line 120V",
      "Official Schneider Electric product record confirms full 120/240 VAC capability",
      "Promoted to complete dual-voltage representation 120/240 VAC",
    ],
    resolvedValue: "120/240 VAC",
  },
  {
    id: "CR-204",
    mpn: "FGID2466QF4A",
    field: "ENERGY STAR CERTIFIED",
    conflictType: "MISSING_EVIDENCE",
    severity: "HIGH",
    state: "REQUIRES_HUMAN",
    sourceA: {
      origin: "RAW_DESCRIPTION",
      rawValue: "(NOT SPECIFIED)",
      confidence: 0.0,
    },
    sourceB: {
      origin: "MFR DOMAIN (site:frigidaire.com)",
      rawValue: "(NOT MENTIONED ON LANDING PAGE)",
      confidence: 0.0,
    },
    taxonomyConstraint: "UNSPSC 40181501 expected attribute",
    algorithmDecision: "Flag for human review — do not hallucinate certification status",
    algorithmRule: "ADJ_MFR_AUTHORITY_FIRST",
    auditTrail: [
      "Energy Star keyword absent in raw distributor description",
      "No Energy Star badge detected on primary manufacturer landing page",
      "Refused to fabricate boolean value — escalated to human review queue",
    ],
    resolvedValue: "(UNVERIFIED - REQUIRES REVIEW)",
  },
  {
    id: "CR-205",
    mpn: "BV-BR-100",
    field: "BODY MATERIAL",
    conflictType: "INFERRED_HIERARCHY",
    severity: "LOW",
    state: "RESOLVED_AUTO",
    sourceA: {
      origin: "RAW_DESCRIPTION ('Bronze / Brass')",
      rawValue: "Bronze / Brass",
      confidence: 0.85,
    },
    sourceB: {
      origin: "MFR PRODUCT SPEC ('ASTM B584 C84400 Cast Bronze')",
      rawValue: "Cast Bronze",
      confidence: 0.98,
    },
    taxonomyConstraint: "Controlled vocabulary requires specific alloy classification",
    algorithmDecision: "Resolve colloquial 'Bronze / Brass' to approved canonical 'Cast Bronze'",
    algorithmRule: "ADJ_MFR_AUTHORITY_FIRST",
    auditTrail: [
      "Distributor combined two distinct alloys with slash notation",
      "Manufacturer engineering spec certifies ASTM B584 Cast Bronze body",
      "Mapped to controlled vocabulary registry 'Cast Bronze'",
    ],
    resolvedValue: "Cast Bronze",
  },
];
