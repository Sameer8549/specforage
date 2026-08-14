"use client";
import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import Link from "next/link";
import {
  VALIDATION_BENCHMARKS,
  ValidationRecord,
  GroundTruthItem,
} from "@/data/validationData";
import {
  CheckCircle,
  Warning,
  XCircle,
  Scales,
  ListNumbers,
  Copy,
  Check,
  ArrowRight,
  Sparkle,
  DownloadSimple,
} from "@phosphor-icons/react";

export default function ValidatePage() {
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string>(
    VALIDATION_BENCHMARKS[0].id
  );
  const [activeTab, setActiveTab] = useState<"GROUND_TRUTH" | "FEATURES_20">("GROUND_TRUTH");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const reduce = useReducedMotion();
  const ease = [0.16, 1, 0.3, 1] as const;

  const activeBenchmark =
    VALIDATION_BENCHMARKS.find((b) => b.id === selectedBenchmarkId) ||
    VALIDATION_BENCHMARKS[0];

  const matchCount = activeBenchmark.groundTruthItems.filter((i) => i.isMatch).length;
  const totalCount = activeBenchmark.groundTruthItems.length;
  const accuracyPct = Math.round((matchCount / totalCount) * 100);

  function copyFeature(feat: string, idx: number) {
    navigator.clipboard.writeText(feat);
    setCopiedKey(`feat-${idx}`);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  return (
    <>
      <div className="noise-overlay" aria-hidden="true" />
      <main style={{ paddingTop: 56 }}>
        <div
          style={{
            width: "100%",
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
                style={{ color: "var(--accent)", marginBottom: 8, fontSize: 11, fontWeight: 600 }}
              >
                Ground-Truth Benchmark Evaluation
              </div>
              <h1
                className="text-display"
                style={{ fontSize: "clamp(2rem, 3.5vw, 3.2rem)" }}
              >
                GROUND-TRUTH BENCHMARK.
              </h1>
            </div>

            {/* Metrics */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, auto)",
                gap: 20,
                borderLeft: "1px solid var(--border)",
                paddingLeft: 24,
              }}
            >
              <div>
                <div className="text-mono-label" style={{ fontSize: 12, color: "var(--fg-dim)" }}>
                  BENCHMARK SKU
                </div>
                <div className="text-mono-data" style={{ fontSize: 18, color: "var(--fg-primary)", marginTop: 4 }}>
                  {activeBenchmark.mpn}
                </div>
              </div>
              <div>
                <div className="text-mono-label" style={{ fontSize: 12, color: "var(--status-ok)" }}>
                  EXACT MATCH RATE
                </div>
                <div className="text-mono-data" style={{ fontSize: 18, color: "var(--status-ok)", marginTop: 4 }}>
                  {accuracyPct}% ({matchCount}/{totalCount})
                </div>
              </div>
              <div>
                <div className="text-mono-label" style={{ fontSize: 12, color: "var(--fg-dim)" }}>
                  FEATURES GOVERNED
                </div>
                <div className="text-mono-data" style={{ fontSize: 18, color: "var(--accent)", marginTop: 4 }}>
                  {activeBenchmark.featureList.length} BULLETS
                </div>
              </div>
            </div>
          </div>

          {/* ── Benchmark Product Switcher ── */}
          <div
            style={{
              padding: "16px 48px",
              borderBottom: "1px solid var(--border)",
              backgroundColor: "var(--bg-surface)",
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <span className="text-mono-label" style={{ fontSize: 12, color: "var(--mono-meta)" }}>
              SELECT EVALUATION SKU:
            </span>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {VALIDATION_BENCHMARKS.map((b) => {
                const isSel = b.id === activeBenchmark.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBenchmarkId(b.id)}
                    style={{
                      background: isSel ? "var(--fg-primary)" : "transparent",
                      color: isSel ? "var(--bg-root)" : "var(--fg-secondary)",
                      border: "1px solid var(--border)",
                      padding: "6px 14px",
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      letterSpacing: "0.06em",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{b.mpn}</span>
                    <span style={{ opacity: 0.7, fontSize: 12 }}>{b.commodityTitle.split("(")[0].trim()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Sub Navigation ── */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid var(--border)",
              backgroundColor: "var(--bg-root)",
            }}
          >
            {(
              [
                { key: "GROUND_TRUTH", label: `SIDE-BY-SIDE GROUND TRUTH (${activeBenchmark.groundTruthItems.length} FIELDS)` },
                { key: "FEATURES_20", label: `STRUCTURED FEATURE BULLETS (${activeBenchmark.featureList.length} ITEMS)` },
              ] as const
            ).map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: "14px 24px",
                    background: active ? "var(--bg-surface)" : "transparent",
                    border: "none",
                    borderBottom: `2px solid ${active ? "var(--accent)" : "transparent"}`,
                    borderRight: "1px solid var(--border)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    color: active ? "var(--fg-primary)" : "var(--fg-secondary)",
                    cursor: "pointer",
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
              {/* TAB 1: SIDE-BY-SIDE GROUND TRUTH */}
              {activeTab === "GROUND_TRUTH" && (
                <motion.div
                  key="GROUND_TRUTH"
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease }}
                  style={{ display: "flex", flexDirection: "column", gap: 20 }}
                >
                  <div style={{ border: "1px solid var(--border)", overflowX: "auto" }}>
                    <div style={{ minWidth: 780 }}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "160px 100px 1fr 1fr 110px",
                          backgroundColor: "var(--bg-elevated)",
                          borderBottom: "1px solid var(--border-dim)",
                        }}
                      >
                        {["TARGET FIELD", "CATEGORY", "GROUND-TRUTH BENCHMARK", "SPECFORGE GENERATED", "VERDICT"].map((h, i) => (
                          <div
                            key={h}
                            className="text-mono-label"
                            style={{ padding: "10px 14px", fontSize: 11.5, color: "var(--fg-dim)", borderRight: i < 4 ? "1px solid var(--border-dim)" : "none" }}
                          >
                            {h}
                          </div>
                        ))}
                      </div>

                      {activeBenchmark.groundTruthItems.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "160px 100px 1fr 1fr 110px",
                            borderTop: "1px solid var(--border-dim)",
                            backgroundColor: item.isMatch ? "transparent" : "rgba(230,25,25,0.02)",
                          }}
                        >
                          {/* Field */}
                          <div className="text-mono-label" style={{ padding: "12px 14px", fontSize: 12, borderRight: "1px solid var(--border-dim)", color: "var(--fg-primary)" }}>
                            {item.field}
                          </div>

                          {/* Category */}
                          <div style={{ padding: "12px 14px", borderRight: "1px solid var(--border-dim)" }}>
                            <span className="badge badge-dim" style={{ fontSize: 11 }}>
                              {item.category}
                            </span>
                          </div>

                          {/* Benchmark */}
                          <div className="text-mono-data" style={{ padding: "12px 14px", fontSize: 11.5, borderRight: "1px solid var(--border-dim)", color: "var(--fg-secondary)" }}>
                            {item.expectedValue}
                          </div>

                          {/* Generated */}
                          <div className="text-mono-data" style={{ padding: "12px 14px", fontSize: 11.5, borderRight: "1px solid var(--border-dim)", color: item.isMatch ? "var(--status-ok)" : "var(--accent)" }}>
                            {item.generatedValue}
                            {item.accuracyDelta && (
                              <div className="text-mono-label" style={{ fontSize: 11.5, color: "var(--status-warn)", marginTop: 4 }}>
                                Note: {item.accuracyDelta}
                              </div>
                            )}
                          </div>

                          {/* Verdict */}
                          <div style={{ padding: "12px 14px", display: "flex", alignItems: "center" }}>
                            <span
                              className="badge"
                              style={{
                                color: item.isMatch ? "var(--status-ok)" : "var(--accent)",
                                borderColor: item.isMatch ? "var(--status-ok)" : "var(--accent)",
                                fontSize: 11,
                              }}
                            >
                              {item.isMatch ? "✓ MATCH" : "✕ MISMATCH"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: 20 STRUCTURED FEATURE BULLETS */}
              {activeTab === "FEATURES_20" && (
                <motion.div
                  key="FEATURES_20"
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease }}
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  <div style={{ border: "1px solid var(--border)" }}>
                    <div
                      style={{
                        padding: "10px 16px",
                        backgroundColor: "var(--bg-elevated)",
                        borderBottom: "1px solid var(--border-dim)",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span className="text-mono-label" style={{ color: "var(--accent)", fontSize: 12, fontWeight: 600 }}>
                        Structured Feature Matrix 1–20 for {activeBenchmark.mpn}
                      </span>
                      <span className="text-mono-label" style={{ fontSize: 12 }}>
                        FORMULA GENERATED · DETERMINISTIC
                      </span>
                    </div>

                    {activeBenchmark.featureList.map((feat, idx) => {
                      const isCopied = copiedKey === `feat-${idx}`;
                      return (
                        <div
                          key={idx}
                          style={{
                            padding: "12px 16px",
                            borderTop: idx > 0 ? "1px solid var(--border-dim)" : "none",
                            display: "grid",
                            gridTemplateColumns: "36px 1fr auto",
                            gap: 16,
                            alignItems: "center",
                          }}
                        >
                          <span className="text-mono-data" style={{ color: "var(--accent)", fontSize: 11 }}>
                            {(idx + 1).toString().padStart(2, "0")}
                          </span>

                          <span className="text-mono-label" style={{ fontSize: 11.5, color: "var(--fg-primary)", lineHeight: 1.4 }}>
                            {feat}
                          </span>

                          <button
                            onClick={() => copyFeature(feat, idx)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: isCopied ? "var(--status-ok)" : "var(--fg-secondary)",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              fontFamily: "var(--font-mono)",
                              fontSize: 11.5,
                            }}
                          >
                            {isCopied ? <Check size={12} /> : <Copy size={12} />}
                            {isCopied ? "COPIED" : "COPY"}
                          </button>
                        </div>
                      );
                    })}
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
