export type ChannelType = "MOBILE" | "INVOICE" | "SHORT" | "LONG" | "RETAIL" | "MARKETING";

export interface DescriptionChannelConfig {
  channel: ChannelType;
  label: string;
  charLimit: number;
  useCase: string;
  defaultFormula: string;
  fontFamily: "mono" | "body";
}

export interface FormulaToken {
  key: string;
  label: string;
  category: "CORE" | "TAXONOMY" | "ATTRIBUTES" | "COMPLIANCE";
  sampleValue: string;
}

export const DESCRIPTION_CHANNELS: DescriptionChannelConfig[] = [
  {
    channel: "MOBILE",
    label: "MOBILE SEARCH & ERP QUICK-PICK",
    charLimit: 50,
    useCase: "Mobile app search dropdowns, warehouse barcode scanner displays, compact ERP tables.",
    defaultFormula: "[Brand] [Size] [Type] [Commodity] [PrimarySpec]",
    fontFamily: "body",
  },
  {
    channel: "INVOICE",
    label: "INVOICE & PURCHASE ORDER BILLING",
    charLimit: 60,
    useCase: "Printed POs, ERP billing lines, shipping manifests with fixed character widths.",
    defaultFormula: "[Brand] [Size] [MaterialAbbr] [Type] [PrimarySpec] [FinishAbbr]",
    fontFamily: "mono",
  },
  {
    channel: "SHORT",
    label: "STANDARD CATALOG GRID (SHORT)",
    charLimit: 80,
    useCase: "Distributor web portal search result grids, catalog cards, category listings.",
    defaultFormula: "[Brand] [Size] [Material] [Type] [Commodity] [PrimarySpec] [Finish]",
    fontFamily: "body",
  },
  {
    channel: "LONG",
    label: "PRODUCT DETAIL PAGE (PDP) LONG",
    charLimit: 200,
    useCase: "Primary e-commerce PDP header title and standard syndication data feed.",
    defaultFormula: "[Brand] [Size] [InstallType] [Commodity] with [KeyFeature1], [PrimarySpec], [Material], [SecondarySpec]",
    fontFamily: "body",
  },
  {
    channel: "RETAIL",
    label: "COMMERCIAL COUNTER & RETAIL DISPLAY",
    charLimit: 150,
    useCase: "Point of sale retail shelf tags, customer-facing counter display terminals.",
    defaultFormula: "[Brand] [Size] [Finish] [Commodity] — [PrimarySpec] [KeyFeature1], [SecondarySpec] ([MPN])",
    fontFamily: "body",
  },
  {
    channel: "MARKETING",
    label: "STRUCTURED MARKETING SUMMARY",
    charLimit: 500,
    useCase: "Multi-sentence synthesized product overview generated deterministically from all verified attributes.",
    defaultFormula: "Experience precision reliability with the [Brand] [MPN]. Designed with [InstallType] construction, [Size] profile, [PrimarySpec] performance, and [Material] durability for commercial and industrial installations.",
    fontFamily: "body",
  },
];

export const AVAILABLE_TOKENS: FormulaToken[] = [
  { key: "[Brand]", label: "Brand Name", category: "CORE", sampleValue: "Frigidaire" },
  { key: "[MPN]", label: "Part Number (MPN)", category: "CORE", sampleValue: "FGID2466QF4A" },
  { key: "[Manufacturer]", label: "Canonical Manufacturer", category: "CORE", sampleValue: "Frigidaire Company" },
  { key: "[Commodity]", label: "UNSPSC Commodity Title", category: "TAXONOMY", sampleValue: "Household Dishwasher" },
  { key: "[Size]", label: "Primary Size / Dimension", category: "ATTRIBUTES", sampleValue: "24 in" },
  { key: "[Material]", label: "Governed Material", category: "ATTRIBUTES", sampleValue: "316 Stainless Steel" },
  { key: "[MaterialAbbr]", label: "Material Abbreviation", category: "ATTRIBUTES", sampleValue: "316SS" },
  { key: "[Finish]", label: "Surface Finish", category: "ATTRIBUTES", sampleValue: "Stainless Steel" },
  { key: "[FinishAbbr]", label: "Finish Abbreviation", category: "ATTRIBUTES", sampleValue: "SS" },
  { key: "[Type]", label: "Sub-Type / Class", category: "ATTRIBUTES", sampleValue: "Built-In" },
  { key: "[InstallType]", label: "Installation Mechanism", category: "ATTRIBUTES", sampleValue: "Built-In" },
  { key: "[PrimarySpec]", label: "Key Rating / Pressure / Decibel", category: "ATTRIBUTES", sampleValue: "47 dB" },
  { key: "[SecondarySpec]", label: "Secondary Attribute", category: "ATTRIBUTES", sampleValue: "14 Place Settings" },
  { key: "[KeyFeature1]", label: "Proprietary Feature Name", category: "ATTRIBUTES", sampleValue: "EvenDry™" },
  { key: "[Certifications]", label: "Standard Certifications", category: "COMPLIANCE", sampleValue: "NSF/ANSI 61 Certified" },
];
