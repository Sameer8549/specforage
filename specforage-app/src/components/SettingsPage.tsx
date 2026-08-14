"use client";
import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import Link from "next/link";
import { DEFAULT_PIPELINE_CONFIG, PipelineConfig } from "@/data/settingsData";
import {
  Gear,
  CheckCircle,
  Warning,
  Sliders,
  ShieldCheck,
  Table,
  Globe,
  DownloadSimple,
  ArrowClockwise,
  Check,
  FileCode,
} from "@phosphor-icons/react";

export default function SettingsPage() {
  const [config, setConfig] = useState<PipelineConfig>(DEFAULT_PIPELINE_CONFIG);
  const [activeTab, setActiveTab] = useState<"THRESHOLDS" | "DISCIPLINE" | "EXPORT_SCHEMA" | "INTEGRATIONS">("THRESHOLDS");
  const [saveToast, setSaveToast] = useState(false);
  const [resetToast, setResetToast] = useState(false);

  const reduce = useReducedMotion();
  const ease = [0.16, 1, 0.3, 1] as const;

  function handleSave() {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  }

  function handleReset() {
    setConfig(DEFAULT_PIPELINE_CONFIG);
    setResetToast(true);
    setTimeout(() => setResetToast(false), 2500);
  }

  function downloadManifest() {
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `specforge_pipeline_manifest_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  return (
    <>
      <div className="noise-overlay" aria-hidden="true" />
      <main style={{ paddingTop: 56 }}>
        <div
          style={{
            maxWidth: 1440,
            margin: "0 auto",
            borderLeft: "1px solid var(--border)",
            borderRight: "1px solid var(--border)",
            minHeight: "calc(100dvh - 56px)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* ── Top Header ── */}
          <div
            style={{
              padding: "36px 48px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              flexWrap: "wrap",
              gap: 24,
            }}
          >
            <div>
              <div
                className="text-mono-label"
                style={{ color: "var(--accent)", marginBottom: 8 }}
              >
                [ SYSTEM / PIPELINE CONFIGURATION & QUALITY GATES ]
              </div>
              <h1
                className="text-display"
                style={{ fontSize: "clamp(2rem, 3.5vw, 3.2rem)" }}
              >
                PIPELINE CONTROL.
              </h1>
            </div>

            {/* Top Actions */}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                onClick={handleReset}
                className="btn-ghost"
                style={{ padding: "8px 14px", fontSize: 11 }}
              >
                <ArrowClockwise size={13} />
                RESET DEFAULTS
              </button>
              <button
                onClick={downloadManifest}
                className="btn-ghost"
                style={{ padding: "8px 14px", fontSize: 11 }}
              >
                <DownloadSimple size={13} />
                EXPORT MANIFEST
              </button>
              <button
                onClick={handleSave}
                className="btn-primary"
                style={{ padding: "8px 18px", fontSize: 11 }}
              >
                <Check size={14} weight="bold" />
                SAVE SETTINGS
              </button>
            </div>
          </div>

          {/* Feedback Toasts */}
          {saveToast && (
            <div
              style={{
                padding: "10px 48px",
                backgroundColor: "rgba(74,246,38,0.08)",
                borderBottom: "1px solid var(--status-ok)",
                color: "var(--status-ok)",
                fontSize: 11,
              }}
              className="text-mono-label"
            >
              ✓ Pipeline configuration successfully saved and applied to active ingestion workers.
            </div>
          )}
          {resetToast && (
            <div
              style={{
                padding: "10px 48px",
                backgroundColor: "rgba(212,160,23,0.08)",
                borderBottom: "1px solid var(--status-warn)",
                color: "var(--status-warn)",
                fontSize: 11,
              }}
              className="text-mono-label"
            >
              ↺ Reset configuration to industrial standard defaults.
            </div>
          )}

          {/* ── Sub Navigation ── */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid var(--border)",
              backgroundColor: "var(--bg-surface)",
              overflowX: "auto",
            }}
          >
            {(
              [
                { key: "THRESHOLDS", label: "QUALITY GATES & THRESHOLDS" },
                { key: "DISCIPLINE", label: "SOURCE DISCIPLINE & TAXONOMY" },
                { key: "EXPORT_SCHEMA", label: "DELIVERY FORMAT SCHEMA MAPPING" },
                { key: "INTEGRATIONS", label: "ERP / PIM WEBHOOKS & API" },
              ] as const
            ).map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: "14px 24px",
                    background: active ? "var(--bg-root)" : "transparent",
                    border: "none",
                    borderBottom: `2px solid ${active ? "var(--accent)" : "transparent"}`,
                    borderRight: "1px solid var(--border)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    color: active ? "var(--fg-primary)" : "var(--fg-secondary)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── Tab Content ── */}
          <div style={{ padding: "36px 48px", flex: 1 }}>
            <AnimatePresence mode="wait">
              {/* TAB 1: THRESHOLDS & QUALITY GATES */}
              {activeTab === "THRESHOLDS" && (
                <motion.div
                  key="THRESHOLDS"
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease }}
                  style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 880 }}
                >
                  {/* Slider 1: Confidence Threshold */}
                  <div style={{ border: "1px solid var(--border)", padding: "20px", backgroundColor: "var(--bg-surface)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <label className="text-mono-data" style={{ fontSize: 13, color: "var(--fg-primary)", fontWeight: 500 }}>
                        MINIMUM ACCEPTABLE CONFIDENCE SCORE
                      </label>
                      <span className="badge" style={{ color: "var(--status-ok)", borderColor: "var(--status-ok)", fontSize: 11 }}>
                        {(config.minConfidenceThreshold * 100).toFixed(0)}%
                      </span>
                    </div>

                    <p className="text-mono-label" style={{ fontSize: 10, color: "var(--fg-secondary)", marginBottom: 12 }}>
                      Any extracted or resolved field with confidence below this threshold is automatically flagged for human review.
                    </p>

                    <input
                      type="range"
                      min="0.50"
                      max="0.99"
                      step="0.01"
                      value={config.minConfidenceThreshold}
                      onChange={(e) =>
                        setConfig({ ...config, minConfidenceThreshold: parseFloat(e.target.value) })
                      }
                      style={{ width: "100%", accentColor: "var(--accent)" }}
                    />
                  </div>

                  {/* Slider 2: Levenshtein Distance */}
                  <div style={{ border: "1px solid var(--border)", padding: "20px", backgroundColor: "var(--bg-surface)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <label className="text-mono-data" style={{ fontSize: 13, color: "var(--fg-primary)", fontWeight: 500 }}>
                        MANUFACTURER FUZZY MATCH MAX DISTANCE
                      </label>
                      <span className="badge badge-dim" style={{ fontSize: 11 }}>
                        {config.maxLevenshteinDistance} EDITS
                      </span>
                    </div>

                    <p className="text-mono-label" style={{ fontSize: 10, color: "var(--fg-secondary)", marginBottom: 12 }}>
                      Maximum Levenshtein edit distance allowed when resolving misspelled distributor manufacturer strings (e.g. &apos;Frigidare&apos; -&gt; &apos;Frigidaire&apos; = 2 edits).
                    </p>

                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="1"
                      value={config.maxLevenshteinDistance}
                      onChange={(e) =>
                        setConfig({ ...config, maxLevenshteinDistance: parseInt(e.target.value, 10) })
                      }
                      style={{ width: "100%", accentColor: "var(--accent)" }}
                    />
                  </div>

                  {/* Toggle: Auto-Escalate Unverified */}
                  <div
                    style={{
                      border: "1px solid var(--border)",
                      padding: "16px 20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: "var(--bg-surface)",
                    }}
                  >
                    <div>
                      <div className="text-mono-data" style={{ fontSize: 13, color: "var(--fg-primary)" }}>
                        AUTO-ESCALATE UNVERIFIED ATTRIBUTES
                      </div>
                      <div className="text-mono-label" style={{ fontSize: 10, color: "var(--fg-secondary)", marginTop: 2 }}>
                        Refuse fallback approximations when factual entailment score is below 0.70.
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={config.autoEscalateUnverified}
                      onChange={(e) =>
                        setConfig({ ...config, autoEscalateUnverified: e.target.checked })
                      }
                      style={{ width: 18, height: 18, accentColor: "var(--accent)", cursor: "pointer" }}
                    />
                  </div>
                </motion.div>
              )}

              {/* TAB 2: SOURCE DISCIPLINE & TAXONOMY */}
              {activeTab === "DISCIPLINE" && (
                <motion.div
                  key="DISCIPLINE"
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease }}
                  style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 880 }}
                >
                  {/* Strict MFR Domain */}
                  <div
                    style={{
                      border: "1px solid var(--border)",
                      padding: "16px 20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: "var(--bg-surface)",
                    }}
                  >
                    <div>
                      <div className="text-mono-data" style={{ fontSize: 13, color: "var(--status-ok)" }}>
                        STRICT OFFICIAL MANUFACTURER DOMAIN ONLY
                      </div>
                      <div className="text-mono-label" style={{ fontSize: 10, color: "var(--fg-secondary)", marginTop: 2 }}>
                        Hard-block all web retrieval queries that do not target a verified manufacturer domain.
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={config.enforceStrictMfrOnly}
                      onChange={(e) =>
                        setConfig({ ...config, enforceStrictMfrOnly: e.target.checked })
                      }
                      style={{ width: 18, height: 18, accentColor: "var(--accent)", cursor: "pointer" }}
                    />
                  </div>

                  {/* Placeholder Stripping */}
                  <div
                    style={{
                      border: "1px solid var(--border)",
                      padding: "16px 20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: "var(--bg-surface)",
                    }}
                  >
                    <div>
                      <div className="text-mono-data" style={{ fontSize: 13, color: "var(--accent)" }}>
                        AGGRESSIVE PLACEHOLDER PATTERN STRIPPING
                      </div>
                      <div className="text-mono-label" style={{ fontSize: 10, color: "var(--fg-secondary)", marginTop: 2 }}>
                        Automatically treat `-- No Unilog Brand --`, `-- Unbranded --`, `N/A`, `Unknown` as null.
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={config.stripPlaceholdersAggressive}
                      onChange={(e) =>
                        setConfig({ ...config, stripPlaceholdersAggressive: e.target.checked })
                      }
                      style={{ width: 18, height: 18, accentColor: "var(--accent)", cursor: "pointer" }}
                    />
                  </div>

                  {/* Taxonomy Version */}
                  <div style={{ border: "1px solid var(--border)", padding: "20px", backgroundColor: "var(--bg-surface)" }}>
                    <label className="text-mono-data" style={{ fontSize: 13, color: "var(--fg-primary)", display: "block", marginBottom: 6 }}>
                      PUBLIC UNSPSC TAXONOMY VERSION ANCHOR
                    </label>

                    <select
                      value={config.taxonomyVersion}
                      onChange={(e) => setConfig({ ...config, taxonomyVersion: e.target.value })}
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "var(--bg-root)",
                        color: "var(--fg-primary)",
                        border: "1px solid var(--border)",
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        width: "100%",
                      }}
                    >
                      <option value="v25.0901 (Public Release)">v25.0901 (Public Release - 55,000+ Codes)</option>
                      <option value="v22.0501 Standard">v22.0501 Standard Edition</option>
                      <option value="v20.0601 Legacy">v20.0601 Legacy Archive</option>
                    </select>
                  </div>
                </motion.div>
              )}

              {/* TAB 3: DELIVERY FORMAT SCHEMA MAPPING */}
              {activeTab === "EXPORT_SCHEMA" && (
                <motion.div
                  key="EXPORT_SCHEMA"
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease }}
                  style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 880 }}
                >
                  <div style={{ border: "1px solid var(--border)" }}>
                    <div
                      style={{
                        padding: "10px 16px",
                        backgroundColor: "var(--bg-elevated)",
                        borderBottom: "1px solid var(--border-dim)",
                      }}
                    >
                      <span className="text-mono-label" style={{ color: "var(--accent)", fontSize: 10 }}>
                        [ ACTIVE DELIVERY FORMAT CSV / JSON COLUMN INCLUSION ]
                      </span>
                    </div>

                    {[
                      { key: "itemId", label: "ITEM_ID (Canonical Identifier)", required: true },
                      { key: "mpn", label: "MFR_PART_NUMBER (MPN)", required: true },
                      { key: "brand", label: "BRAND_NAME (Resolved Trademark)", required: true },
                      { key: "manufacturer", label: "MANUFACTURER_NAME (Canonical Entity)", required: true },
                      { key: "unspscCode", label: "UNSPSC_CODE (8-Digit Commodity)", required: true },
                      { key: "unspscClasspath", label: "UNSPSC_CLASSPATH (Full Hierarchy Tree)", required: false },
                      { key: "shortDescMobile", label: "SHORT_DESC_MOBILE (Max 50 Chars)", required: false },
                      { key: "shortDescInvoice", label: "SHORT_DESC_INVOICE (Max 60 Chars Monospace)", required: false },
                      { key: "shortDescStandard", label: "SHORT_DESC_STANDARD (Max 80 Chars PDP)", required: true },
                      { key: "longDesc", label: "LONG_DESC (Max 200 Chars)", required: false },
                      { key: "retailDesc", label: "RETAIL_DESC (Max 150 Chars)", required: false },
                      { key: "marketingDesc", label: "MARKETING_DESC (Max 500 Chars)", required: false },
                      { key: "attributeColumns", label: "ATTR_* (Normalized Governed Properties)", required: true },
                      { key: "provenanceSourceMeta", label: "PROVENANCE_SOURCE (Domain & URL Trace)", required: false },
                    ].map((col) => {
                      const k = col.key as keyof PipelineConfig["exportFormatColumns"];
                      const isChecked = config.exportFormatColumns[k];

                      return (
                        <div
                          key={col.key}
                          style={{
                            padding: "12px 18px",
                            borderTop: "1px solid var(--border-dim)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span className="text-mono-data" style={{ fontSize: 12, color: "var(--fg-primary)" }}>
                              {col.label}
                            </span>
                            {col.required && (
                              <span className="badge badge-dim" style={{ fontSize: 8 }}>
                                MANDATORY
                              </span>
                            )}
                          </div>

                          <input
                            type="checkbox"
                            disabled={col.required}
                            checked={isChecked}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                exportFormatColumns: {
                                  ...config.exportFormatColumns,
                                  [k]: e.target.checked,
                                },
                              })
                            }
                            style={{ width: 16, height: 16, accentColor: "var(--accent)", cursor: col.required ? "not-allowed" : "pointer" }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* TAB 4: INTEGRATIONS */}
              {activeTab === "INTEGRATIONS" && (
                <motion.div
                  key="INTEGRATIONS"
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease }}
                  style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 880 }}
                >
                  <div style={{ border: "1px solid var(--border)", padding: "20px", backgroundColor: "var(--bg-surface)" }}>
                    <label className="text-mono-data" style={{ fontSize: 13, color: "var(--fg-primary)", display: "block", marginBottom: 6 }}>
                      ERP / PIM AUTOMATED INGESTION WEBHOOK
                    </label>

                    <p className="text-mono-label" style={{ fontSize: 10, color: "var(--fg-secondary)", marginBottom: 12 }}>
                      SpecForge dispatches RFC-4180 batch delivery payloads to this endpoint upon verification completion.
                    </p>

                    <input
                      type="text"
                      value={config.erpIntegrationWebhook}
                      onChange={(e) => setConfig({ ...config, erpIntegrationWebhook: e.target.value })}
                      className="input-underline"
                      style={{ padding: "8px", border: "1px solid var(--border)", fontSize: 12 }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </>
  );
}
