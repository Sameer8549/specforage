export interface PipelineConfig {
  minConfidenceThreshold: number; // 0.50 to 0.99
  maxLevenshteinDistance: number; // 1 to 3
  enforceStrictMfrOnly: boolean;
  stripPlaceholdersAggressive: boolean;
  taxonomyVersion: string;
  classificationMinConfidence: number;
  enableAllDescriptionChannels: boolean;
  autoEscalateUnverified: boolean;
  apiKeyManagement: {
    primaryProvider: "SPECFORGE_HOSTED" | "OPENAI_DIRECT" | "ANTHROPIC_DIRECT" | "CUSTOM_GATEWAY";
    apiKeyMasked: string;
    rateLimitPerMinute: number;
    usageAlertThreshold: number;
  };
  modelRouting: {
    extractionEngine: string;
    taxonomyClassifier: string;
    entailmentVerifier: string;
    fallbackOfflineEngine: string;
  };
  fileManagement: {
    activeTaxonomyFile: string;
    activeVocabularyFile: string;
    lastSynced: string;
    autoUpdateTaxonomyMonthly: boolean;
  };
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
  apiKeyManagement: {
    primaryProvider: "SPECFORGE_HOSTED",
    apiKeyMasked: "Configured server-side only",
    rateLimitPerMinute: 600,
    usageAlertThreshold: 50000,
  },
  modelRouting: {
    extractionEngine: "Claude 3.5 Sonnet / Deterministic Pattern Engine",
    taxonomyClassifier: "UNSPSC Vector Hierarchy Indexer v25",
    entailmentVerifier: "Strict Deterministic Text Entailment Validator",
    fallbackOfflineEngine: "Local Regex & Tokenized Grammar Slot-Filler",
  },
  fileManagement: {
    activeTaxonomyFile: "unspsc_v25_0901_public_release.json",
    activeVocabularyFile: "controlled_vocab_industrial_v4.2.csv",
    lastSynced: "2026-08-14T03:00:00Z",
    autoUpdateTaxonomyMonthly: true,
  },
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
