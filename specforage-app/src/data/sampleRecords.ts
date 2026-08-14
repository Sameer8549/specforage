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

export const SAMPLE_RECORDS: ProductRecord[] = [
  {
    id: "REC-001",
    mpn: "FGID2466QF4A",
    upc: "012505562723",
    brand: "Frigidaire",
    brandInferred: true,
    manufacturer: "Frigidare",
    canonicalManufacturer: "Frigidaire Company",
    unspscCode: "40181501",
    unspscClasspath: "Distribution & Conditioning → Plumbing Fixtures → Dishwashers → Household Dishwashers",
    segment: "40 — Distribution & Conditioning Systems",
    family: "4018 — Plumbing fixtures",
    class: "401815 — Dishwashers",
    commodity: "40181501 — Household dishwashers",
    overallConfidence: 0.95,
    coveragePercent: 90,
    reviewStatus: "REQUIRES REVIEW",
    flagCount: 2,
    createdAt: "2026-08-14T03:45:00Z",
    attributes: [
      { name: "WIDTH", rawValue: "24 in.", normalizedValue: "24 in", source: "RAW_DESCRIPTION", confidence: 0.97, vocabState: "MATCHED", entailment: "ENTAILED" },
      { name: "INSTALLATION TYPE", rawValue: "Built-In", normalizedValue: "Built-In", source: "RAW_DESCRIPTION", confidence: 0.98, vocabState: "MATCHED", entailment: "ENTAILED" },
      { name: "NOISE LEVEL", rawValue: "47dB", normalizedValue: "47 dB", source: "RAW_DESCRIPTION", confidence: 0.99, vocabState: "MATCHED", entailment: "ENTAILED" },
      { name: "FINISH", rawValue: "SS", normalizedValue: "Stainless Steel", source: "site:frigidaire.com", confidence: 0.96, vocabState: "MATCHED", entailment: "ENTAILED" },
      { name: "CAPACITY", rawValue: "14 place settings", normalizedValue: "14 Place Settings", source: "site:frigidaire.com", confidence: 0.94, vocabState: "FIRST SEEN", entailment: "ENTAILED" },
      { name: "CONTROLS TYPE", rawValue: "Front Controls", normalizedValue: "Front Controls", source: "site:frigidaire.com", confidence: 0.92, vocabState: "MATCHED", entailment: "ENTAILED" },
      { name: "HEATED DRY", rawValue: "EvenDry", normalizedValue: "EvenDry™", source: "RAW_DESCRIPTION", confidence: 0.95, vocabState: "MATCHED", entailment: "ENTAILED" },
      { name: "ENERGY STAR", rawValue: "N/A", normalizedValue: "(UNVERIFIED)", source: "UNRESOLVED", confidence: 0.35, vocabState: "FLAGGED", entailment: "UNVERIFIED" },
    ],
    descriptions: [
      { type: "MOBILE", limit: 50, text: "Frigidaire 24 in Built-In Dishwasher 47 dB" },
      { type: "INVOICE", limit: 60, text: "Frigidaire 24 in Built-In Dishwasher EvenDry 47 dB SS" },
      { type: "SHORT", limit: 80, text: "Frigidaire 24 in Built-In Dishwasher EvenDry 47 dB Stainless Steel" },
      { type: "LONG", limit: 200, text: "Frigidaire 24 in Built-In Dishwasher with EvenDry Drying System, 47 dB, Stainless Steel Interior, 14 Place Settings, Front Controls" },
      { type: "RETAIL", limit: 150, text: "Frigidaire 24 in Stainless Steel Built-In Dishwasher — 47 dB EvenDry, 14 Place Settings, Front Controls" },
      { type: "MARKETING", limit: 500, text: "Experience quiet, efficient dishwashing with the Frigidaire FGID2466QF4A. Built-In installation, 24-inch width, EvenDry™ technology, and a 47 dB operation level make it a standout choice for modern commercial and residential installations." },
    ],
    adjudicationLog: [
      { step: "01", field: "BRAND", rawInput: "-- No Unilog Brand --", resolvedValue: "Frigidaire", action: "STRIP & INFER", reason: "Stripped invalid placeholder; inferred from canonical manufacturer" },
      { step: "02", field: "MANUFACTURER", rawInput: "Frigidare", resolvedValue: "Frigidaire Company", action: "FUZZY MATCH", reason: "Levenshtein distance 2; matched approved mfr authority registry" },
      { step: "03", field: "NOISE LEVEL", rawInput: "47dB", resolvedValue: "47 dB", action: "STANDARDIZE UOM", reason: "Inserted space before dB; verified within UNSPSC 40181501 tolerance" },
    ],
  },
  {
    id: "REC-002",
    mpn: "PF-90-SS-075",
    upc: "782116034182",
    brand: "Swagelok",
    brandInferred: false,
    manufacturer: "Swagelok Co.",
    canonicalManufacturer: "Swagelok Company",
    unspscCode: "40141700",
    unspscClasspath: "Distribution & Conditioning → Fluid & Gas Flow → Pipe Fittings → Stainless Steel Elbows",
    segment: "40 — Distribution & Conditioning Systems",
    family: "4014 — Fluid and gas distribution",
    class: "401417 — Pipe fittings",
    commodity: "40141720 — 90 degree pipe elbows",
    overallConfidence: 0.99,
    coveragePercent: 100,
    reviewStatus: "VERIFIED",
    flagCount: 0,
    createdAt: "2026-08-14T04:10:00Z",
    attributes: [
      { name: "FITTING TYPE", rawValue: "90 Deg Elbow", normalizedValue: "90° Elbow", source: "RAW_DESCRIPTION", confidence: 0.99, vocabState: "MATCHED", entailment: "ENTAILED" },
      { name: "MATERIAL", rawValue: "316 SS", normalizedValue: "316 Stainless Steel", source: "RAW_DESCRIPTION", confidence: 0.99, vocabState: "MATCHED", entailment: "ENTAILED" },
      { name: "PIPE SIZE", rawValue: "3/4 in.", normalizedValue: "3/4 in", source: "RAW_DESCRIPTION", confidence: 0.98, vocabState: "MATCHED", entailment: "ENTAILED" },
      { name: "CONNECTION TYPE", rawValue: "FNPT x FNPT", normalizedValue: "Female NPT x Female NPT", source: "site:swagelok.com", confidence: 0.97, vocabState: "MATCHED", entailment: "ENTAILED" },
      { name: "MAX PRESSURE", rawValue: "5100 psig", normalizedValue: "5100 psi", source: "site:swagelok.com", confidence: 0.96, vocabState: "MATCHED", entailment: "ENTAILED" },
      { name: "TEMP RATING", rawValue: "-20 to 450 F", normalizedValue: "-20°F to 450°F", source: "site:swagelok.com", confidence: 0.95, vocabState: "MATCHED", entailment: "ENTAILED" },
    ],
    descriptions: [
      { type: "MOBILE", limit: 50, text: "Swagelok 3/4 in 316SS 90 Deg FNPT Elbow" },
      { type: "INVOICE", limit: 60, text: "Swagelok 3/4 in 316 Stainless Steel 90° FNPT Pipe Elbow" },
      { type: "SHORT", limit: 80, text: "Swagelok 3/4 in 316 Stainless Steel 90° Female NPT Pipe Elbow, 5100 psi" },
      { type: "LONG", limit: 200, text: "Swagelok 3/4 in Female NPT x Female NPT 90° Pipe Elbow, 316 Stainless Steel Construction, Rated to 5100 psi Pressure, Temperature Range -20°F to 450°F" },
      { type: "RETAIL", limit: 150, text: "Swagelok 3/4 in 316 Stainless Steel 90° NPT Elbow — Heavy Industrial High Pressure Fitting (5100 psi)" },
      { type: "MARKETING", limit: 500, text: "Engineered for leak-tight integrity in aggressive environments, the Swagelok PF-90-SS-075 provides precision 3/4-inch FNPT 90-degree directional flow in 316 stainless steel with a maximum working pressure of 5,100 psig." },
    ],
    adjudicationLog: [
      { step: "01", field: "MANUFACTURER", rawInput: "Swagelok Co.", resolvedValue: "Swagelok Company", action: "NORMALIZE", reason: "Standardized corporation suffix" },
      { step: "02", field: "PRESSURE UNIT", rawInput: "5100 psig", resolvedValue: "5100 psi", action: "STANDARDIZE UOM", reason: "Converted gauge specification to canonical PSI representation" },
    ],
  },
  {
    id: "REC-003",
    mpn: "QO120",
    upc: "785901400103",
    brand: "Square D",
    brandInferred: false,
    manufacturer: "Schneider Electric",
    canonicalManufacturer: "Schneider Electric USA, Inc.",
    unspscCode: "39121603",
    unspscClasspath: "Electrical Systems → Circuit Protection → Circuit Breakers → Miniature Circuit Breakers",
    segment: "39 — Electrical Systems, Lighting & Components",
    family: "3912 — Electrical equipment & components",
    class: "391216 — Circuit protection devices",
    commodity: "39121603 — Miniature circuit breakers",
    overallConfidence: 0.98,
    coveragePercent: 95,
    reviewStatus: "VERIFIED",
    flagCount: 0,
    createdAt: "2026-08-14T04:22:00Z",
    attributes: [
      { name: "AMPERAGE", rawValue: "20A", normalizedValue: "20 A", source: "RAW_DESCRIPTION", confidence: 0.99, vocabState: "MATCHED", entailment: "ENTAILED" },
      { name: "POLE COUNT", rawValue: "1-Pole", normalizedValue: "1 Pole", source: "RAW_DESCRIPTION", confidence: 0.99, vocabState: "MATCHED", entailment: "ENTAILED" },
      { name: "VOLTAGE", rawValue: "120/240V", normalizedValue: "120/240 VAC", source: "RAW_DESCRIPTION", confidence: 0.98, vocabState: "MATCHED", entailment: "ENTAILED" },
      { name: "INTERRUPT RATING", rawValue: "10 kA", normalizedValue: "10 kA AIR", source: "site:se.com", confidence: 0.96, vocabState: "MATCHED", entailment: "ENTAILED" },
      { name: "MOUNTING TYPE", rawValue: "Plug-On", normalizedValue: "Plug-On Neutral / QO", source: "site:se.com", confidence: 0.95, vocabState: "MATCHED", entailment: "ENTAILED" },
      { name: "TRIP TYPE", rawValue: "Thermal-Magnetic", normalizedValue: "Thermal-Magnetic", source: "site:se.com", confidence: 0.97, vocabState: "MATCHED", entailment: "ENTAILED" },
    ],
    descriptions: [
      { type: "MOBILE", limit: 50, text: "Square D QO 20A 1-Pole 120V Circuit Breaker" },
      { type: "INVOICE", limit: 60, text: "Square D QO120 20 Amp 1-Pole 120/240V Miniature Breaker" },
      { type: "SHORT", limit: 80, text: "Square D QO 20 Amp Single-Pole Plug-On Circuit Breaker 120/240 VAC 10 kA" },
      { type: "LONG", limit: 200, text: "Square D by Schneider Electric QO 20 Amp 1-Pole Plug-On Thermal-Magnetic Circuit Breaker, 120/240 VAC, 10 kA Interrupt Rating, Visi-Trip Indicator" },
      { type: "RETAIL", limit: 150, text: "Square D QO 20-Amp 1-Pole Plug-In Standard Circuit Breaker with Visi-Trip Diagnostic Window (QO120)" },
      { type: "MARKETING", limit: 500, text: "The Square D by Schneider Electric QO 20 Amp Single-Pole Circuit Breaker is designed for overload and short-circuit protection of your electrical system. Features exclusive Visi-Trip indicator for instant tripped-circuit identification." },
    ],
    adjudicationLog: [
      { step: "01", field: "VOLTAGE", rawInput: "120/240V", resolvedValue: "120/240 VAC", action: "APPEND CURRENT TYPE", reason: "Standardized AC voltage representation for circuit protection devices" },
    ],
  },
  {
    id: "REC-004",
    mpn: "BV-BR-100",
    upc: "689228001429",
    brand: "Apollo Valves",
    brandInferred: false,
    manufacturer: "Apollo Conbraco",
    canonicalManufacturer: "Conbraco Industries, Inc. (Apollo Valves)",
    unspscCode: "40141607",
    unspscClasspath: "Distribution & Conditioning → Fluid & Gas Flow → Valves → Ball Valves",
    segment: "40 — Distribution & Conditioning Systems",
    family: "4014 — Fluid and gas distribution",
    class: "401416 — Valves",
    commodity: "40141607 — Ball valves",
    overallConfidence: 0.96,
    coveragePercent: 92,
    reviewStatus: "VERIFIED",
    flagCount: 1,
    createdAt: "2026-08-14T04:30:00Z",
    attributes: [
      { name: "VALVE SIZE", rawValue: "1 in.", normalizedValue: "1 in", source: "RAW_DESCRIPTION", confidence: 0.99, vocabState: "MATCHED", entailment: "ENTAILED" },
      { name: "BODY MATERIAL", rawValue: "Bronze / Brass", normalizedValue: "Cast Bronze", source: "site:apollovalves.com", confidence: 0.97, vocabState: "MATCHED", entailment: "ENTAILED" },
      { name: "PORT TYPE", rawValue: "Full Port", normalizedValue: "Full Port", source: "RAW_DESCRIPTION", confidence: 0.98, vocabState: "MATCHED", entailment: "ENTAILED" },
      { name: "PRESSURE CLASS", rawValue: "600 CWP", normalizedValue: "600 psi CWP / 150 psi SWP", source: "site:apollovalves.com", confidence: 0.95, vocabState: "FIRST SEEN", entailment: "ENTAILED" },
      { name: "HANDLE TYPE", rawValue: "Lever", normalizedValue: "Zinc-Plated Steel Lever w/ Vinyl Grip", source: "site:apollovalves.com", confidence: 0.93, vocabState: "MATCHED", entailment: "ENTAILED" },
      { name: "LEAD COMPLIANCE", rawValue: "Lead-Free", normalizedValue: "NSF/ANSI 61 & 372 Certified", source: "RAW_DESCRIPTION", confidence: 0.96, vocabState: "MATCHED", entailment: "ENTAILED" },
    ],
    descriptions: [
      { type: "MOBILE", limit: 50, text: "Apollo 1 in Full Port Bronze Ball Valve 600 CWP" },
      { type: "INVOICE", limit: 60, text: "Apollo 1 in Bronze Full-Port FNPT Ball Valve 600 CWP" },
      { type: "SHORT", limit: 80, text: "Apollo Valves 1 in Bronze Full Port NPT Threaded Ball Valve 600 psi CWP" },
      { type: "LONG", limit: 200, text: "Apollo Valves 1 in Full Port Female NPT Threaded Bronze Ball Valve, 600 psi CWP / 150 psi SWP, Zinc-Plated Steel Lever Handle, NSF/ANSI 61 Lead-Free Certified" },
      { type: "RETAIL", limit: 150, text: "Apollo 1-in Lead-Free Full Port Bronze Ball Valve — 600 CWP High Flow Commercial Water / Gas Valve" },
      { type: "MARKETING", limit: 500, text: "The Apollo 77CLF series lead-free bronze full port ball valve offers premium commercial-grade flow characteristics and 100% factory air testing for potable water, steam, and compressed gas systems." },
    ],
    adjudicationLog: [
      { step: "01", field: "MANUFACTURER", rawInput: "Apollo Conbraco", resolvedValue: "Conbraco Industries, Inc. (Apollo Valves)", action: "CANONICAL RESOLUTION", reason: "Mapped colloquial division title to registered parent corporate name" },
    ],
  },
];
