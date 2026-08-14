export interface QualityScorecard {
  taxonomyCoveragePercent: number;
  attributeFillRatePercent: number;
  averageConfidencePercent: number;
  entailmentRatioPercent: number;
  totalCatalogRows: number;
  verifiedRecords: number;
  flaggedForReview: number;
  rejectedPlaceholders: number;
}

export interface ReviewQueueItem {
  id: string;
  mpn: string;
  brand: string;
  commodityTitle: string;
  field: string;
  proposedValue: string;
  confidence: number;
  flagType: "INFERRED_BRAND" | "UNVERIFIED_EVIDENCE" | "FIRST_SEEN_VOCAB" | "UOM_CONVERSION";
  reason: string;
  status: "PENDING" | "APPROVED" | "DISMISSED";
  timestamp: string;
}

export interface AuditLogEvent {
  id: string;
  timestamp: string;
  agentOrSystem: string;
  mpn: string;
  eventType: "EXTRACTION" | "CLASSIFICATION" | "ADJUDICATION" | "GOVERNANCE_OVERRIDE" | "SECURITY_BLOCK";
  severity: "INFO" | "WARN" | "CRITICAL";
  details: string;
}

export const QUALITY_SCORECARD_DATA: QualityScorecard = {
  taxonomyCoveragePercent: 98.4,
  attributeFillRatePercent: 92.6,
  averageConfidencePercent: 97.0,
  entailmentRatioPercent: 98.6,
  totalCatalogRows: 4820,
  verifiedRecords: 4590,
  flaggedForReview: 182,
  rejectedPlaceholders: 48,
};

export const INITIAL_REVIEW_QUEUE: ReviewQueueItem[] = [
  {
    id: "REV-001",
    mpn: "FGID2466QF4A",
    brand: "Frigidaire",
    commodityTitle: "Household dishwashers",
    field: "BRAND",
    proposedValue: "Frigidaire (Inferred)",
    confidence: 0.88,
    flagType: "INFERRED_BRAND",
    reason: "Placeholder '-- No Unilog Brand --' was stripped. Inferred from canonical manufacturer 'Frigidaire Company'.",
    status: "PENDING",
    timestamp: "2026-08-14T03:45:00Z",
  },
  {
    id: "REV-002",
    mpn: "FGID2466QF4A",
    brand: "Frigidaire",
    commodityTitle: "Household dishwashers",
    field: "ENERGY STAR CERTIFIED",
    proposedValue: "(UNVERIFIED)",
    confidence: 0.35,
    flagType: "UNVERIFIED_EVIDENCE",
    reason: "Keyword absent in raw catalog description and not detected on primary manufacturer landing page.",
    status: "PENDING",
    timestamp: "2026-08-14T03:45:02Z",
  },
  {
    id: "REV-003",
    mpn: "PF-90-SS-075",
    brand: "Swagelok",
    commodityTitle: "90 degree pipe elbows",
    field: "MATERIAL",
    proposedValue: "Super Duplex 2507",
    confidence: 0.92,
    flagType: "FIRST_SEEN_VOCAB",
    reason: "Encountered novel alloy candidate in specialized catalog. Queued for vocabulary registry promotion.",
    status: "PENDING",
    timestamp: "2026-08-14T04:10:00Z",
  },
  {
    id: "REV-004",
    mpn: "BV-BR-100",
    brand: "Apollo Valves",
    commodityTitle: "Ball valves",
    field: "PRESSURE CLASS",
    proposedValue: "600 psi CWP / 150 psi SWP",
    confidence: 0.95,
    flagType: "UOM_CONVERSION",
    reason: "Standardized dual CWP / SWP cold non-shock rating conforming to ASME B16.34.",
    status: "PENDING",
    timestamp: "2026-08-14T04:30:00Z",
  },
];

export const INITIAL_AUDIT_LOGS: AuditLogEvent[] = [
  {
    id: "LOG-8801",
    timestamp: "2026-08-14T04:30:20Z",
    agentOrSystem: "SpecForge Pipeline Stage 07",
    mpn: "BV-BR-100",
    eventType: "ADJUDICATION",
    severity: "INFO",
    details: "Resolved body material 'Bronze / Brass' to controlled vocabulary canonical 'Cast Bronze' (conf 0.97).",
  },
  {
    id: "LOG-8802",
    timestamp: "2026-08-14T04:22:15Z",
    agentOrSystem: "Domain Guard Service",
    mpn: "QO120",
    eventType: "SECURITY_BLOCK",
    severity: "WARN",
    details: "Intercepted and dropped unverified distributor link 'grainger.com/product/4A891' during extraction.",
  },
  {
    id: "LOG-8803",
    timestamp: "2026-08-14T04:10:05Z",
    agentOrSystem: "SpecForge Pipeline Stage 04",
    mpn: "PF-90-SS-075",
    eventType: "EXTRACTION",
    severity: "INFO",
    details: "Extracted pressure rating '5100 psig' from manufacturer PDF spec sheet 'MS-01-140.pdf'.",
  },
  {
    id: "LOG-8804",
    timestamp: "2026-08-14T03:45:12Z",
    agentOrSystem: "SpecForge Pipeline Stage 01",
    mpn: "FGID2466QF4A",
    eventType: "CLASSIFICATION",
    severity: "WARN",
    details: "Stripped placeholder token '-- No Unilog Brand --'; flagged field for human governance review.",
  },
  {
    id: "LOG-8805",
    timestamp: "2026-08-14T03:30:00Z",
    agentOrSystem: "UNSPSC Classifier v25",
    mpn: "ALL_BATCH",
    eventType: "CLASSIFICATION",
    severity: "INFO",
    details: "Anchored 8 batch items against public UNSPSC v25 hierarchy with 97.4% average semantic alignment.",
  },
];
