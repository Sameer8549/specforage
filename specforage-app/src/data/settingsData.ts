export interface PipelineConfig {
  minConfidenceThreshold: number; // 0.50 to 0.99
  maxLevenshteinDistance: number; // 1 to 3
  enforceStrictMfrOnly: boolean;
  stripPlaceholdersAggressive: boolean;
  taxonomyVersion: string;
  classificationMinConfidence: number;
  enableAllDescriptionChannels: boolean;
  autoEscalateUnverified: boolean;
  exportFormatColumns: {
    itemId: boolean;
    mpn: boolean;
    brand: boolean;
    manufacturer: boolean;
    unspscCode: boolean;
    unspscClasspath: boolean;
    shortDescMobile: boolean;
    shortDescInvoice: boolean;
    shortDescStandard: boolean;
    longDesc: boolean;
    retailDesc: boolean;
    marketingDesc: boolean;
    attributeColumns: boolean;
    provenanceSourceMeta: boolean;
  };
  erpIntegrationWebhook: string;
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  minConfidenceThreshold: 0.85,
  maxLevenshteinDistance: 2,
  enforceStrictMfrOnly: true,
  stripPlaceholdersAggressive: true,
  taxonomyVersion: "v25.0901 (Public Release)",
  classificationMinConfidence: 0.80,
  enableAllDescriptionChannels: true,
  autoEscalateUnverified: true,
  exportFormatColumns: {
    itemId: true,
    mpn: true,
    brand: true,
    manufacturer: true,
    unspscCode: true,
    unspscClasspath: true,
    shortDescMobile: true,
    shortDescInvoice: true,
    shortDescStandard: true,
    longDesc: true,
    retailDesc: false,
    marketingDesc: false,
    attributeColumns: true,
    provenanceSourceMeta: true,
  },
  erpIntegrationWebhook: "https://api.distributor-pim.internal/v1/specforge/webhook",
};
