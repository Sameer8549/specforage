export interface ManufacturerDomain {
  id: string;
  name: string;
  primaryDomain: string;
  allowedSubdomains: string[];
  aliases: string[];
  parentCompany?: string;
  status: "VERIFIED_AUTHORITY" | "PENDING_REVIEW";
  sslVerified: boolean;
  queriesRun: number;
}

export interface BlockedSource {
  domain: string;
  category: "MARKETPLACE" | "DISTRIBUTOR" | "AGGREGATOR" | "FORUM";
  reason: string;
  blockedQueriesCount: number;
}

export interface ProvenanceTraceItem {
  id: string;
  mpn: string;
  field: string;
  extractedValue: string;
  sourceType: "MANUFACTURER_DOMAIN" | "RAW_CATALOG_ROW" | "PDF_SPEC_SHEET";
  domain: string;
  url: string;
  queryExecuted: string;
  httpStatus: number;
  snippetMatch: string;
  entailmentScore: number;
  entailmentVerdict: "ENTAILED" | "UNVERIFIED" | "CONFLICT";
  timestamp: string;
}

export const VERIFIED_MANUFACTURERS: ManufacturerDomain[] = [
  {
    id: "MFR-001",
    name: "Frigidaire (Electrolux)",
    primaryDomain: "frigidaire.com",
    allowedSubdomains: ["manuals.frigidaire.com", "parts.frigidaire.com"],
    aliases: ["Frigidare", "Frigidaire Company", "Frigidaire Major Appliances"],
    parentCompany: "Electrolux AB (publ)",
    status: "VERIFIED_AUTHORITY",
    sslVerified: true,
    queriesRun: 1420,
  },
  {
    id: "MFR-002",
    name: "Swagelok Company",
    primaryDomain: "swagelok.com",
    allowedSubdomains: ["products.swagelok.com", "msds.swagelok.com"],
    aliases: ["Swagelok Co.", "Swagelok Fluid Systems"],
    status: "VERIFIED_AUTHORITY",
    sslVerified: true,
    queriesRun: 3105,
  },
  {
    id: "MFR-003",
    name: "Schneider Electric (Square D)",
    primaryDomain: "se.com",
    allowedSubdomains: ["download.schneider-electric.com", "squared.se.com"],
    aliases: ["Square D", "Square D by Schneider", "Schneider Electric USA"],
    parentCompany: "Schneider Electric SE",
    status: "VERIFIED_AUTHORITY",
    sslVerified: true,
    queriesRun: 5890,
  },
  {
    id: "MFR-004",
    name: "Conbraco Industries (Apollo Valves)",
    primaryDomain: "apollovalves.com",
    allowedSubdomains: ["catalog.apollovalves.com"],
    aliases: ["Apollo Valves", "Apollo Conbraco", "Conbraco Ind"],
    parentCompany: "Aalberts Industries N.V.",
    status: "VERIFIED_AUTHORITY",
    sslVerified: true,
    queriesRun: 870,
  },
  {
    id: "MFR-005",
    name: "Goulds Water Technology (Xylem)",
    primaryDomain: "goulds.com",
    allowedSubdomains: ["documents.goulds.com"],
    aliases: ["Goulds Pumps", "Goulds Water Tech"],
    parentCompany: "Xylem Inc.",
    status: "VERIFIED_AUTHORITY",
    sslVerified: true,
    queriesRun: 1140,
  },
];

export const BLACKLISTED_DOMAINS: BlockedSource[] = [
  { domain: "amazon.com", category: "MARKETPLACE", reason: "User-submitted / third-party seller spec inaccuracy", blockedQueriesCount: 8412 },
  { domain: "ebay.com", category: "MARKETPLACE", reason: "Uncontrolled seller descriptions & refurbished variants", blockedQueriesCount: 6210 },
  { domain: "grainger.com", category: "DISTRIBUTOR", reason: "Distributor re-packaging / non-canonical taxonomy", blockedQueriesCount: 4980 },
  { domain: "homedepot.com", category: "DISTRIBUTOR", reason: "Retail consumer phrasing / non-standardized UOM", blockedQueriesCount: 3820 },
  { domain: "ferguson.com", category: "DISTRIBUTOR", reason: "Secondary channel catalog re-writing", blockedQueriesCount: 2910 },
  { domain: "zoro.com", category: "DISTRIBUTOR", reason: "Syndicated feed aggregator with truncated MPNs", blockedQueriesCount: 2450 },
  { domain: "alibaba.com", category: "MARKETPLACE", reason: "Unverified OEM / copycat listings", blockedQueriesCount: 1980 },
];

export const SAMPLE_PROVENANCE_TRACES: ProvenanceTraceItem[] = [
  {
    id: "TRC-101",
    mpn: "FGID2466QF4A",
    field: "FINISH",
    extractedValue: "Stainless Steel",
    sourceType: "MANUFACTURER_DOMAIN",
    domain: "frigidaire.com",
    url: "https://www.frigidaire.com/en/p/kitchen/dishwashers/FGID2466QF",
    queryExecuted: 'site:frigidaire.com "FGID2466QF4A" OR "FGID2466QF"',
    httpStatus: 200,
    snippetMatch: '...Exterior Finish: Stainless Steel (Smudge-Proof™)...',
    entailmentScore: 0.98,
    entailmentVerdict: "ENTAILED",
    timestamp: "2026-08-14T03:45:12Z",
  },
  {
    id: "TRC-102",
    mpn: "FGID2466QF4A",
    field: "CAPACITY",
    extractedValue: "14 Place Settings",
    sourceType: "MANUFACTURER_DOMAIN",
    domain: "frigidaire.com",
    url: "https://www.frigidaire.com/en/p/kitchen/dishwashers/FGID2466QF",
    queryExecuted: 'site:frigidaire.com "FGID2466QF" "place settings"',
    httpStatus: 200,
    snippetMatch: '...Capacity: 14 Place Settings with Deluxe Nylon Racks...',
    entailmentScore: 0.96,
    entailmentVerdict: "ENTAILED",
    timestamp: "2026-08-14T03:45:13Z",
  },
  {
    id: "TRC-103",
    mpn: "PF-90-SS-075",
    field: "MAX WORKING PRESSURE",
    extractedValue: "5100 psi",
    sourceType: "PDF_SPEC_SHEET",
    domain: "swagelok.com",
    url: "https://www.swagelok.com/downloads/webcatalogs/EN/MS-01-140.pdf",
    queryExecuted: 'site:swagelok.com "PF-90-SS-075" filetype:pdf',
    httpStatus: 200,
    snippetMatch: '...316 SS 3/4 in. Female NPT Elbow: Working Pressure Rating @ 100°F: 5100 psig (351 bar)...',
    entailmentScore: 0.99,
    entailmentVerdict: "ENTAILED",
    timestamp: "2026-08-14T04:10:05Z",
  },
  {
    id: "TRC-104",
    mpn: "QO120",
    field: "INTERRUPT RATING",
    extractedValue: "10 kA AIR",
    sourceType: "MANUFACTURER_DOMAIN",
    domain: "se.com",
    url: "https://www.se.com/us/en/product/QO120/miniature-circuit-breaker-qo-20a-1p-120-240vac-10ka/",
    queryExecuted: 'site:se.com "QO120" "interrupt rating"',
    httpStatus: 200,
    snippetMatch: '...Interrupting Rating: 10 kA 120/240 V AC 50/60 Hz conforming to UL 489...',
    entailmentScore: 0.99,
    entailmentVerdict: "ENTAILED",
    timestamp: "2026-08-14T04:22:15Z",
  },
  {
    id: "TRC-105",
    mpn: "BV-BR-100",
    field: "PRESSURE CLASS",
    extractedValue: "600 psi CWP / 150 psi SWP",
    sourceType: "MANUFACTURER_DOMAIN",
    domain: "apollovalves.com",
    url: "https://www.apollovalves.com/products/77c-series-bronze-ball-valve/",
    queryExecuted: 'site:apollovalves.com "BV-BR-100" OR "77C" "CWP"',
    httpStatus: 200,
    snippetMatch: '...Pressure Rating: 600 psig CWP, Cold Non-Shock. 150 psig SWP...',
    entailmentScore: 0.97,
    entailmentVerdict: "ENTAILED",
    timestamp: "2026-08-14T04:30:20Z",
  },
];
