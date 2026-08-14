export interface GroundTruthItem {
  id: string;
  mpn: string;
  field: string;
  category: "CORE" | "TAXONOMY" | "ATTRIBUTE" | "DESCRIPTION";
  expectedValue: string;
  generatedValue: string;
  isMatch: boolean;
  accuracyDelta?: string;
}

export interface ValidationRecord {
  id: string;
  mpn: string;
  commodityTitle: string;
  overallAccuracyPercent: number;
  groundTruthItems: GroundTruthItem[];
  featureList: string[];
}

export const VALIDATION_BENCHMARKS: ValidationRecord[] = [
  {
    id: "VAL-001",
    mpn: "FGID2466QF4A",
    commodityTitle: "Household dishwashers (UNSPSC 40181501)",
    overallAccuracyPercent: 96.5,
    featureList: [
      "EvenDry™ System for consistent, complete drying results",
      "OrbitClean® Wash Arm delivers 4x better water coverage",
      "DishSense™ Technology automatically adjusts cycle times",
      "Smudge-Proof™ Stainless Steel resists fingerprints and cleans easily",
      "Ultra-Quiet 47 dBA Sound Level for peaceful living spaces",
      "Multiple Cycle Options: Heavy Wash, Normal Wash, Quick Wash, Rinse Only",
      "Energy Saver Plus Cycle uses less energy without sacrificing performance",
      "Deluxe Nylon Upper and Lower Racks with Fold-Down Tines",
      "NSF® Certified Sanitize Cycle removes 99.9% of household bacteria",
      "Stay-Put Door stays at whatever angle you open it",
      "Front Electronic Controls with Digital Status Indicator Display",
      "Tall Tub Design accommodates up to 14 standard place settings",
      "Stainless Steel Filtration System with Removable Filter Trap",
      "Heated Dry Option with Calrod® Heating Element",
      "Delay Start Timer (2, 4, or 6 hours)",
      "Child Lockout Feature prevents unintended cycle changes",
      "Corrosion-Resistant Polymer Tub Interior with Stainless Door Liner",
      "Self-Cleaning Filtration eliminates manual filter pre-rinsing",
      "Standard 24-inch Undercounter Cutout Installation Dimensions",
      "ADA Compliant Accessible Height Profile Option",
    ],
    groundTruthItems: [
      { id: "GT-01", mpn: "FGID2466QF4A", field: "MANUFACTURER", category: "CORE", expectedValue: "Frigidaire Company", generatedValue: "Frigidaire Company", isMatch: true },
      { id: "GT-02", mpn: "FGID2466QF4A", field: "BRAND", category: "CORE", expectedValue: "Frigidaire", generatedValue: "Frigidaire", isMatch: true },
      { id: "GT-03", mpn: "FGID2466QF4A", field: "UNSPSC CODE", category: "TAXONOMY", expectedValue: "40181501", generatedValue: "40181501", isMatch: true },
      { id: "GT-04", mpn: "FGID2466QF4A", field: "NOISE LEVEL", category: "ATTRIBUTE", expectedValue: "47 dB", generatedValue: "47 dB", isMatch: true },
      { id: "GT-05", mpn: "FGID2466QF4A", field: "WIDTH", category: "ATTRIBUTE", expectedValue: "24 in", generatedValue: "24 in", isMatch: true },
      { id: "GT-06", mpn: "FGID2466QF4A", field: "FINISH", category: "ATTRIBUTE", expectedValue: "Stainless Steel", generatedValue: "Stainless Steel", isMatch: true },
      { id: "GT-07", mpn: "FGID2466QF4A", field: "CAPACITY", category: "ATTRIBUTE", expectedValue: "14 Place Settings", generatedValue: "14 Place Settings", isMatch: true },
      { id: "GT-08", mpn: "FGID2466QF4A", field: "ENERGY STAR", category: "ATTRIBUTE", expectedValue: "Certified Tier 1", generatedValue: "(UNVERIFIED)", isMatch: false, accuracyDelta: "Absent on landing page — refused hallucination" },
      { id: "GT-09", mpn: "FGID2466QF4A", field: "SHORT_DESC_MOBILE", category: "DESCRIPTION", expectedValue: "Frigidaire 24 in Built-In Dishwasher 47 dB", generatedValue: "Frigidaire 24 in Built-In Dishwasher 47 dB", isMatch: true },
      { id: "GT-10", mpn: "FGID2466QF4A", field: "SHORT_DESC_INVOICE", category: "DESCRIPTION", expectedValue: "Frigidaire 24 in Built-In Dishwasher EvenDry 47 dB SS", generatedValue: "Frigidaire 24 in Built-In Dishwasher EvenDry 47 dB SS", isMatch: true },
    ],
  },
  {
    id: "VAL-002",
    mpn: "PF-90-SS-075",
    commodityTitle: "90 degree pipe elbows (UNSPSC 40141720)",
    overallAccuracyPercent: 100.0,
    featureList: [
      "Precision Machined 316 Stainless Steel for Maximum Corrosion Resistance",
      "90-Degree Female NPT to Female NPT Directional Pressure Elbow",
      "Rated to 5,100 psig Working Pressure at 100°F (351 bar)",
      "Operating Temperature Range: -20°F to 450°F (-28°C to 232°C)",
      "ANSI/ASME B1.20.1 NPT Tapered Pipe Thread Specifications",
      "Smooth Internal Flow Radius Minimizes Fluid Turbulence and Pressure Drop",
      "100% Factory Tested for Leak-Tight Pneumatic Performance at 1,000 psig",
      "Heavy Hex Design Provides Flat Wrench Engagement for Easy Assembly",
      "Traceable Material Heat Numbers Permanently Marked on Fitting Body",
      "Compatible with Severe Chemical, Hydraulic, and Instrumentation Lines",
    ],
    groundTruthItems: [
      { id: "GT-11", mpn: "PF-90-SS-075", field: "MANUFACTURER", category: "CORE", expectedValue: "Swagelok Company", generatedValue: "Swagelok Company", isMatch: true },
      { id: "GT-12", mpn: "PF-90-SS-075", field: "UNSPSC CODE", category: "TAXONOMY", expectedValue: "40141720", generatedValue: "40141720", isMatch: true },
      { id: "GT-13", mpn: "PF-90-SS-075", field: "MATERIAL", category: "ATTRIBUTE", expectedValue: "316 Stainless Steel", generatedValue: "316 Stainless Steel", isMatch: true },
      { id: "GT-14", mpn: "PF-90-SS-075", field: "PIPE SIZE", category: "ATTRIBUTE", expectedValue: "3/4 in", generatedValue: "3/4 in", isMatch: true },
      { id: "GT-15", mpn: "PF-90-SS-075", field: "CONNECTION", category: "ATTRIBUTE", expectedValue: "Female NPT x Female NPT", generatedValue: "Female NPT x Female NPT", isMatch: true },
      { id: "GT-16", mpn: "PF-90-SS-075", field: "MAX PRESSURE", category: "ATTRIBUTE", expectedValue: "5100 psi", generatedValue: "5100 psi", isMatch: true },
    ],
  },
  {
    id: "VAL-003",
    mpn: "QO120",
    commodityTitle: "Miniature circuit breakers (UNSPSC 39121603)",
    overallAccuracyPercent: 100.0,
    featureList: [
      "Exclusive Visi-Trip™ Indicator Flags Tripped Breaker in Red Window",
      "Standard 1-Pole 20-Amp Overcurrent Branch Circuit Protection",
      "120/240 VAC Dual Voltage System Compatibility",
      "10 kA Interrupting Rating (AIR) Conforming to UL 489 Standards",
      "Plug-On Design for Fast Installation in Square D QO Load Centers",
      "Thermal-Magnetic Trip Mechanism Provides Fast-Acting Short Circuit Protection",
      "Accepts Aluminum or Copper Conductors (#14 to #8 AWG)",
      "ANSI Certified and CSA Listed for Commercial & Residential Applications",
    ],
    groundTruthItems: [
      { id: "GT-17", mpn: "QO120", field: "MANUFACTURER", category: "CORE", expectedValue: "Schneider Electric USA, Inc.", generatedValue: "Schneider Electric USA, Inc.", isMatch: true },
      { id: "GT-18", mpn: "QO120", field: "BRAND", category: "CORE", expectedValue: "Square D", generatedValue: "Square D", isMatch: true },
      { id: "GT-19", mpn: "QO120", field: "UNSPSC CODE", category: "TAXONOMY", expectedValue: "39121603", generatedValue: "39121603", isMatch: true },
      { id: "GT-20", mpn: "QO120", field: "AMPERAGE", category: "ATTRIBUTE", expectedValue: "20 A", generatedValue: "20 A", isMatch: true },
      { id: "GT-21", mpn: "QO120", field: "POLE COUNT", category: "ATTRIBUTE", expectedValue: "1 Pole", generatedValue: "1 Pole", isMatch: true },
      { id: "GT-22", mpn: "QO120", field: "VOLTAGE", category: "ATTRIBUTE", expectedValue: "120/240 VAC", generatedValue: "120/240 VAC", isMatch: true },
    ],
  },
];
