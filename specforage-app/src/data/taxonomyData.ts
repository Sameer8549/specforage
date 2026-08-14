export interface AttributeSchema {
  name: string;
  type: "TEXT" | "NUMERIC" | "ENUM" | "RANGE";
  uom?: string;
  required: boolean;
  allowedValues?: string[];
  normalizationRule: string;
}

export interface CommodityItem {
  code: string;
  title: string;
  description: string;
  expectedAttributes: AttributeSchema[];
  sampleDescriptions: string[];
}

export interface ClassItem {
  code: string;
  title: string;
  commodities: CommodityItem[];
}

export interface FamilyItem {
  code: string;
  title: string;
  classes: ClassItem[];
}

export interface SegmentItem {
  code: string;
  title: string;
  families: FamilyItem[];
}

export const UNSPSC_VERSION = "v25.0901 (Public Release)";

export const TAXONOMY_TREE: SegmentItem[] = [
  {
    code: "40",
    title: "Distribution and Conditioning Systems and Equipment and Components",
    families: [
      {
        code: "4018",
        title: "Plumbing fixtures",
        classes: [
          {
            code: "401815",
            title: "Dishwashers",
            commodities: [
              {
                code: "40181501",
                title: "Household dishwashers",
                description: "Residential and light commercial undercounter and built-in dishwashing units.",
                expectedAttributes: [
                  { name: "WIDTH", type: "NUMERIC", uom: "in", required: true, normalizationRule: "Convert to inches, standard fraction" },
                  { name: "INSTALLATION TYPE", type: "ENUM", required: true, allowedValues: ["Built-In", "Freestanding", "Portable", "Drawer"], normalizationRule: "Approved list match" },
                  { name: "NOISE LEVEL", type: "NUMERIC", uom: "dB", required: true, normalizationRule: "Space before dB" },
                  { name: "FINISH", type: "ENUM", required: true, allowedValues: ["Stainless Steel", "Black Stainless", "White", "Panel Ready"], normalizationRule: "Titlecase standard color" },
                  { name: "CAPACITY", type: "NUMERIC", uom: "Place Settings", required: true, normalizationRule: "Integer + Place Settings" },
                  { name: "CONTROLS TYPE", type: "ENUM", required: false, allowedValues: ["Front Controls", "Top Controls", "Hidden Electronic"], normalizationRule: "Controlled registry" },
                  { name: "ENERGY STAR CERTIFIED", type: "ENUM", required: false, allowedValues: ["Yes", "No", "Energy Star Most Efficient"], normalizationRule: "Boolean / Tier" },
                ],
                sampleDescriptions: [
                  "24 in Built-In Dishwasher w/ EvenDry 47dB Stainless Steel",
                  "Whirlpool 24-Inch Heavy-Duty Top Control Dishwasher in Monochromatic Stainless",
                  "Bosch 300 Series 24 in 44 dBA Front Control Tall Tub Dishwasher",
                ],
              },
              {
                code: "40181502",
                title: "Commercial dishwashers",
                description: "Heavy duty conveyor, door-type, and flight-type dishwashing machines for institutional food service.",
                expectedAttributes: [
                  { name: "RACK CAPACITY", type: "NUMERIC", uom: "racks/hr", required: true, normalizationRule: "Standardized hourly throughput" },
                  { name: "VOLTAGE", type: "ENUM", required: true, allowedValues: ["208V", "240V", "480V 3-Phase"], normalizationRule: "Electrical voltage standards" },
                  { name: "SANITIZING TYPE", type: "ENUM", required: true, allowedValues: ["High Temp Sanitizing", "Chemical Sanitizing"], normalizationRule: "NSF Standard 3 Classification" },
                ],
                sampleDescriptions: [
                  "Hobart AM15-2 Door-Type High Temp Commercial Dishwasher 208-240V",
                  "CMA Dishmachines Energy Mizer Undercounter Chemical Sanitizing Dishwasher",
                ],
              },
            ],
          },
          {
            code: "401817",
            title: "Sinks and wash basins",
            commodities: [
              {
                code: "40181702",
                title: "Kitchen sinks",
                description: "Single and double basin kitchen wash fixtures in stainless steel, cast iron, or composite.",
                expectedAttributes: [
                  { name: "BOWL COUNT", type: "ENUM", required: true, allowedValues: ["Single Bowl", "Double Bowl", "Triple Bowl"], normalizationRule: "Standard bowl taxonomy" },
                  { name: "MOUNTING TYPE", type: "ENUM", required: true, allowedValues: ["Undermount", "Drop-In / Top Mount", "Farmhouse / Apron Front"], normalizationRule: "Standard fixture mounting" },
                  { name: "MATERIAL", type: "ENUM", required: true, allowedValues: ["18-Gauge 304 Stainless", "16-Gauge Stainless", "Enameled Cast Iron", "Granite Composite"], normalizationRule: "Material registry" },
                ],
                sampleDescriptions: [
                  "Kohler 33 in Double Equal Bowl Undermount Stainless Steel Kitchen Sink",
                  "Elkay Quartz Classic 33x22 Drop-In Single Bowl Composite Sink",
                ],
              },
            ],
          },
        ],
      },
      {
        code: "4014",
        title: "Fluid and gas distribution",
        classes: [
          {
            code: "401416",
            title: "Valves",
            commodities: [
              {
                code: "40141607",
                title: "Ball valves",
                description: "Quarter-turn rotational ball valves for on/off fluid shutoff control in industrial piping.",
                expectedAttributes: [
                  { name: "VALVE SIZE", type: "NUMERIC", uom: "in", required: true, normalizationRule: "Fractional inch standard" },
                  { name: "BODY MATERIAL", type: "ENUM", required: true, allowedValues: ["Bronze", "Cast Bronze", "316 Stainless Steel", "Carbon Steel", "Forged Brass"], normalizationRule: "Alloy code standard" },
                  { name: "PORT TYPE", type: "ENUM", required: true, allowedValues: ["Full Port", "Standard Port", "Reduced Port"], normalizationRule: "Flow port classification" },
                  { name: "PRESSURE CLASS", type: "NUMERIC", uom: "psi", required: true, normalizationRule: "CWP / SWP standard conversion" },
                  { name: "END CONNECTION", type: "ENUM", required: true, allowedValues: ["FNPT x FNPT", "Socket Weld", "Flanged 150#", "Press Fit"], normalizationRule: "ASME B1.20.1 Thread specification" },
                ],
                sampleDescriptions: [
                  "Apollo 1 in Full Port Bronze Ball Valve 600 CWP NPT Lever Handle",
                  "Nibco 2 in 316SS Two-Piece Full Port Threaded Ball Valve 1000 WOG",
                  "Milwaukee Valve 3/4 in Brass Standard Port Ball Valve Lead Free",
                ],
              },
              {
                code: "40141604",
                title: "Check valves",
                description: "Non-return directional flow prevention valves including swing, lift, and silent wafer check types.",
                expectedAttributes: [
                  { name: "CHECK MECHANISM", type: "ENUM", required: true, allowedValues: ["Swing Check", "Dual Plate Wafer", "Spring Loaded Lift", "Ball Check"], normalizationRule: "Mechanism taxonomy" },
                  { name: "VALVE SIZE", type: "NUMERIC", uom: "in", required: true, normalizationRule: "Fractional inches" },
                  { name: "CRACKING PRESSURE", type: "NUMERIC", uom: "psi", required: false, normalizationRule: "Spring cracking pressure in PSI" },
                ],
                sampleDescriptions: [
                  "Crane 2 in Cast Iron 125# Flanged Swing Check Valve",
                  "Parker 1/2 in Inline Spring Check Valve 316SS 5 psi Cracking",
                ],
              },
            ],
          },
          {
            code: "401417",
            title: "Pipe fittings",
            commodities: [
              {
                code: "40141720",
                title: "90 degree pipe elbows",
                description: "Right-angle directional pipe fittings for threaded, welded, or compression pressure piping systems.",
                expectedAttributes: [
                  { name: "FITTING TYPE", type: "ENUM", required: true, allowedValues: ["90° Elbow", "90° Street Elbow", "Long Radius 90° Elbow"], normalizationRule: "Angle & degree symbol standard" },
                  { name: "MATERIAL", type: "ENUM", required: true, allowedValues: ["316 Stainless Steel", "304 Stainless Steel", "Forged Carbon Steel A105", "Schedule 40 PVC"], normalizationRule: "Material specification standard" },
                  { name: "PIPE SIZE", type: "NUMERIC", uom: "in", required: true, normalizationRule: "Nominal pipe size (NPS)" },
                  { name: "CONNECTION TYPE", type: "ENUM", required: true, allowedValues: ["Female NPT x Female NPT", "Male NPT x Female NPT", "Socket Weld", "Butt Weld"], normalizationRule: "Thread & joint canonical mapping" },
                  { name: "MAX WORKING PRESSURE", type: "NUMERIC", uom: "psi", required: true, normalizationRule: "Pressure rating integer in PSI" },
                ],
                sampleDescriptions: [
                  "Swagelok 3/4 in 316 Stainless Steel 90 Deg FNPT Pipe Elbow 5100 psig",
                  "Anvil 1 in Class 150 Malleable Iron 90-Degree Threaded Elbow",
                  "Spears 2 in Schedule 80 PVC 90 Degree Socket Elbow",
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    code: "39",
    title: "Electrical Systems and Lighting and Components and Accessories",
    families: [
      {
        code: "3912",
        title: "Electrical equipment and components",
        classes: [
          {
            code: "391216",
            title: "Circuit protection devices",
            commodities: [
              {
                code: "39121603",
                title: "Miniature circuit breakers",
                description: "Overcurrent and short circuit branch protection breakers for commercial and residential load centers.",
                expectedAttributes: [
                  { name: "AMPERAGE", type: "NUMERIC", uom: "A", required: true, normalizationRule: "Integer + space + A" },
                  { name: "POLE COUNT", type: "ENUM", required: true, allowedValues: ["1 Pole", "2 Pole", "3 Pole", "Tandem 1-Pole"], normalizationRule: "Standard pole terminology" },
                  { name: "VOLTAGE RATING", type: "ENUM", required: true, allowedValues: ["120 VAC", "120/240 VAC", "240 VAC", "277/480Y VAC"], normalizationRule: "AC voltage standardized representation" },
                  { name: "INTERRUPTING RATING", type: "NUMERIC", uom: "kA", required: true, normalizationRule: "kA AIR notation" },
                  { name: "MOUNTING TYPE", type: "ENUM", required: true, allowedValues: ["Plug-On", "Bolt-On", "DIN Rail Mount"], normalizationRule: "Enclosure mounting mechanism" },
                  { name: "TRIP MECHANISM", type: "ENUM", required: true, allowedValues: ["Thermal-Magnetic", "Electronic / Micrologic", "Hydraulic-Magnetic"], normalizationRule: "Trip curve classification" },
                ],
                sampleDescriptions: [
                  "Square D QO120 20A 1-Pole 120/240V 10kA Miniature Circuit Breaker",
                  "Eaton BR250 50-Amp 2-Pole 120/240V Standard Trip Plug-In Circuit Breaker",
                  "Siemens B320 20A 3-Pole 240V Bolt-On Industrial Breaker 10kA",
                ],
              },
              {
                code: "39121606",
                title: "Industrial fuses",
                description: "Current-limiting cartridge, plug, and semiconductor fuses for industrial motor and feeder circuits.",
                expectedAttributes: [
                  { name: "FUSE CLASS", type: "ENUM", required: true, allowedValues: ["Class CC", "Class J", "Class RK5", "Class RK1", "Class L"], normalizationRule: "UL Fuse Classification code" },
                  { name: "AMPERE RATING", type: "NUMERIC", uom: "A", required: true, normalizationRule: "Current rating standard" },
                  { name: "TIME DELAY", type: "ENUM", required: true, allowedValues: ["Time-Delay / Slow-Blow", "Fast-Acting"], normalizationRule: "Temporal response standard" },
                ],
                sampleDescriptions: [
                  "Bussmann LP-CC-30 30 Amp 600V Low-Peak Class CC Time-Delay Fuse",
                  "Littelfuse JTD-100 100A 600V Class J Time-Delay Industrial Fuse",
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    code: "23",
    title: "Industrial Manufacturing and Processing Machinery and Accessories",
    families: [
      {
        code: "2315",
        title: "Industrial process pumps and compressors",
        classes: [
          {
            code: "231515",
            title: "Pumps",
            commodities: [
              {
                code: "23151501",
                title: "Centrifugal pumps",
                description: "Rotodynamic pumps that use a rotating impeller to increase the pressure and flow rate of fluids.",
                expectedAttributes: [
                  { name: "FLOW RATE MAX", type: "NUMERIC", uom: "GPM", required: true, normalizationRule: "Gallons per minute integer" },
                  { name: "TOTAL DYNAMIC HEAD", type: "NUMERIC", uom: "ft", required: true, normalizationRule: "Feet of head" },
                  { name: "HORSEPOWER", type: "NUMERIC", uom: "HP", required: true, normalizationRule: "Motor HP rating" },
                  { name: "IMPELLER MATERIAL", type: "ENUM", required: true, allowedValues: ["316 Stainless", "Cast Iron", "Bronze", "Noryl"], normalizationRule: "Wetted component alloy" },
                ],
                sampleDescriptions: [
                  "Goulds Water Technology 1.5 HP 3-Phase Stainless Steel End Suction Centrifugal Pump 85 GPM",
                  "Bell & Gossett Series e-1510 End Suction Pump 5 HP 150 GPM 90 ft Head",
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];
