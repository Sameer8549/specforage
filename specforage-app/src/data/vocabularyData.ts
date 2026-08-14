export type VocabState = "MATCHED" | "FIRST SEEN" | "FLAGGED";

export interface VocabTerm {
  id: string;
  category: "MATERIALS" | "FINISHES" | "CONNECTIONS" | "UOM" | "MOUNTING" | "VALVE_TYPES";
  canonicalTerm: string;
  synonyms: string[];
  status: VocabState;
  frequency: number;
  lastEncountered: string;
  governanceNote?: string;
}

export const VOCABULARY_REGISTRY: VocabTerm[] = [
  // Materials
  {
    id: "VOC-001",
    category: "MATERIALS",
    canonicalTerm: "316 Stainless Steel",
    synonyms: ["316 SS", "316SS", "AISI 316", "316 Stainless", "Grade 316"],
    status: "MATCHED",
    frequency: 3420,
    lastEncountered: "2026-08-14T04:10:00Z",
  },
  {
    id: "VOC-002",
    category: "MATERIALS",
    canonicalTerm: "304 Stainless Steel",
    synonyms: ["304 SS", "304SS", "18-8 Stainless", "AISI 304"],
    status: "MATCHED",
    frequency: 2890,
    lastEncountered: "2026-08-14T03:55:00Z",
  },
  {
    id: "VOC-003",
    category: "MATERIALS",
    canonicalTerm: "Cast Bronze",
    synonyms: ["Bronze", "Cast Bronze Alloy", "85-5-5-5 Bronze", "C83600 Bronze"],
    status: "MATCHED",
    frequency: 1240,
    lastEncountered: "2026-08-14T04:30:00Z",
  },
  {
    id: "VOC-004",
    category: "MATERIALS",
    canonicalTerm: "Forged Carbon Steel A105",
    synonyms: ["A105", "Carbon Steel", "ASTM A105", "Forged Steel"],
    status: "MATCHED",
    frequency: 980,
    lastEncountered: "2026-08-13T22:15:00Z",
  },
  {
    id: "VOC-005",
    category: "MATERIALS",
    canonicalTerm: "Super Duplex 2507",
    synonyms: ["Alloy 2507", "UNS S32750"],
    status: "FIRST SEEN",
    frequency: 14,
    lastEncountered: "2026-08-14T02:10:00Z",
    governanceNote: "Novel alloy encountered in specialized offshore instrumentation catalog. Pending approval.",
  },

  // Finishes
  {
    id: "VOC-010",
    category: "FINISHES",
    canonicalTerm: "Stainless Steel",
    synonyms: ["SS", "Smudge-Proof Stainless", "Monochromatic Stainless", "Brushed Stainless"],
    status: "MATCHED",
    frequency: 4120,
    lastEncountered: "2026-08-14T03:45:00Z",
  },
  {
    id: "VOC-011",
    category: "FINISHES",
    canonicalTerm: "Black Stainless",
    synonyms: ["Black Stainless Steel", "Matte Black Stainless"],
    status: "MATCHED",
    frequency: 1540,
    lastEncountered: "2026-08-13T18:30:00Z",
  },
  {
    id: "VOC-012",
    category: "FINISHES",
    canonicalTerm: "Zinc-Plated Vinyl Grip",
    synonyms: ["Zinc Lever", "Plated Steel w/ Grip"],
    status: "FIRST SEEN",
    frequency: 22,
    lastEncountered: "2026-08-14T04:30:00Z",
    governanceNote: "Composite handle finish parsed from industrial ball valve spec sheet.",
  },

  // Connections
  {
    id: "VOC-020",
    category: "CONNECTIONS",
    canonicalTerm: "Female NPT x Female NPT",
    synonyms: ["FNPT x FNPT", "FNPT", "Female NPT", "NPT Threaded Female"],
    status: "MATCHED",
    frequency: 5410,
    lastEncountered: "2026-08-14T04:10:00Z",
  },
  {
    id: "VOC-021",
    category: "CONNECTIONS",
    canonicalTerm: "Male NPT x Female NPT",
    synonyms: ["MNPT x FNPT", "Street NPT", "Male x Female NPT"],
    status: "MATCHED",
    frequency: 2190,
    lastEncountered: "2026-08-14T01:20:00Z",
  },
  {
    id: "VOC-022",
    category: "CONNECTIONS",
    canonicalTerm: "Press-Fit x Press-Fit",
    synonyms: ["Press Fit", "Viega ProPress Compatible", "M-Press"],
    status: "FLAGGED",
    frequency: 8,
    lastEncountered: "2026-08-14T04:05:00Z",
    governanceNote: "Brand-proprietary term 'ProPress' mixed into generic connection field. Flagged for separation.",
  },

  // UOM
  {
    id: "VOC-030",
    category: "UOM",
    canonicalTerm: "in",
    synonyms: ["inch", "inches", "IN.", "in.", '"'],
    status: "MATCHED",
    frequency: 18400,
    lastEncountered: "2026-08-14T04:30:00Z",
  },
  {
    id: "VOC-031",
    category: "UOM",
    canonicalTerm: "psi",
    synonyms: ["psig", "PSI", "lbs/sq in", "CWP"],
    status: "MATCHED",
    frequency: 9320,
    lastEncountered: "2026-08-14T04:10:00Z",
  },
  {
    id: "VOC-032",
    category: "UOM",
    canonicalTerm: "dB",
    synonyms: ["dBA", "db", "decibels", "dB(A)"],
    status: "MATCHED",
    frequency: 2100,
    lastEncountered: "2026-08-14T03:45:00Z",
  },
  {
    id: "VOC-033",
    category: "UOM",
    canonicalTerm: "kA AIR",
    synonyms: ["kA", "AIC", "kA Interrupting Rating", "kAIR"],
    status: "MATCHED",
    frequency: 3120,
    lastEncountered: "2026-08-14T04:22:00Z",
  },
];
