"use client";
import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import Link from "next/link";
import {
  CONFLICT_CASES,
  ADJUDICATION_RULES,
  ConflictCase,
  AdjudicationRule,
} from "@/data/adjudicationData";
import {
  Gavel,
  CheckCircle,
  Warning,
  Scales,
  ArrowRight,
  Sparkle,
  Check,
  X,
  FileText,
  Sliders,
  TreeStructure,
  ShieldCheck,
} from "@phosphor-icons/react";

function getSeverityBadge(sev: ConflictCase["severity"]) {
  if (sev === "LOW") return { color: "var(--fg-secondary)", label: "LOW" };
  if (sev === "MEDIUM") return { color: "var(--status-warn)", label: "MEDIUM" };
  return { color: "var(--accent)", label: "HIGH" };
}

function getStateBadge(state: ConflictCase["state"]) {
  if (state === "RESOLVED_AUTO") return { color: "var(--status-ok)", label: "RESOLVED (AUTO)" };
  if (state === "REQUIRES_HUMAN") return { color: "var(--status-warn)", label: "REQUIRES HUMAN" };
  return { color: "var(--accent)", label: "OVERRIDDEN" };
}

export default function AdjudicationPage() {
  const [cases, setCases] = useState<ConflictCase[]>(CONFLICT_CASES);
  const [selectedCaseId, setSelectedCaseId] = useState<string>(CONFLICT_CASES[0].id);
  const [activeTab, setActiveTab] = useState<"CASES" | "RULES" | "SANDBOX">("CASES");
  const [customOverrideVal, setCustomOverrideVal] = useState("");
  const [overrideSuccess, setOverrideSuccess] = useState(false);

  // Sandbox state
  const [sandField, setSandField] = useState("NOISE LEVEL");
  const [sandValA, setSandValA] = useState("47dB (Raw Description)");
  const [sandValB, setSandValB] = useState("47 dBA (Mfr Spec Sheet)");
  const [sandResult, setSandResult] = useState<{
    winner: string;
    resolvedValue: string;
    rule: string;
    reasoning: string;
  } | null>(null);

  const reduce = useReducedMotion();
  const ease = [0.16, 1, 0.3, 1] as const;

  const activeCase = cases.find((c) => c.id === selectedCaseId) || cases[0];

  function applyOverride(newVal: string, note: string) {
    if (!newVal.trim()) return;
    setCases((prev) =>
      prev.map((c) =>
        c.id === activeCase.id
          ? {
              ...c,
              resolvedValue: newVal.trim(),
              state: "OVERRIDDEN",
              governorNotes: note,
              auditTrail: [
                ...c.auditTrail,
                `[GOVERNOR OVERRIDE] Manual value '${newVal.trim()}' applied: ${note}`,
              ],
            }
          : c
      )
    );
    setOverrideSuccess(true);
    setTimeout(() => setOverrideSuccess(false), 2500);
  }

  function runSandbox(field: string, a: string, b: string) {
    let resolved = "47 dB";
    let rule = "ADJ_UOM_CANONICAL_STANDARDIZATION";
    let reasoning = "Space standard inserted before dB unit; both sources agree on integer 47.";

    const f = field.toLowerCase();
    if (f.includes("brand") || a.includes("--")) {
      resolved = "Frigidaire";
      rule = "ADJ_PLACEHOLDER_ZERO_TOLERANCE";
      reasoning = "Stripped placeholder and inferred brand from canonical manufacturer authority.";
    } else if (f.includes("pressure") || a.includes("psig") || b.includes("bar")) {
      resolved = "5100 psi";
      rule = "ADJ_UOM_CANONICAL_STANDARDIZATION";
      reasoning = "Converted 5100 psig to canonical PSI standard conforming to UNSPSC 40141720 schema.";
    } else if (f.includes("voltage")) {
      resolved = "120/240 VAC";
      rule = "ADJ_MFR_AUTHORITY_FIRST";
      reasoning = "Authoritative manufacturer documentation prioritized over truncated distributor snippet.";
    }

    setSandResult({
      winner: "Candidate B (Authoritative Mfr Spec)",
      resolvedValue: resolved,
      rule,
      reasoning,
    });
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
                style={{ color: "var(--accent)", marginBottom: 8, fontSize: 11, fontWeight: 600 }}
              >
                Conflict Adjudication & Resolution Engine
              </div>
              <h1
                className="text-display"
                style={{ fontSize: "clamp(2rem, 3.5vw, 3.2rem)" }}
              >
                DETERMINISTIC ADJUDICATION.
              </h1>
            </div>

            {/* Metrics */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, auto)",
                gap: 24,
                borderLeft: "1px solid var(--border)",
                paddingLeft: 24,
              }}
            >
              <div>
                <div className="text-mono-label" style={{ fontSize: 10, color: "var(--fg-dim)" }}>
                  CONFLICT CASES
                </div>
                <div className="text-mono-data" style={{ fontSize: 18, color: "var(--fg-primary)", marginTop: 4 }}>
                  {cases.length} AUDITED
                </div>
              </div>
              <div>
                <div className="text-mono-label" style={{ fontSize: 10, color: "var(--status-ok)" }}>
                  AUTO-RESOLVED
                </div>
                <div className="text-mono-data" style={{ fontSize: 18, color: "var(--status-ok)", marginTop: 4 }}>
                  80.0%
                </div>
              </div>
              <div>
                <div className="text-mono-label" style={{ fontSize: 10, color: "var(--status-warn)" }}>
                  HUMAN QUEUE
                </div>
                <div className="text-mono-data" style={{ fontSize: 18, color: "var(--status-warn)", marginTop: 4 }}>
                  {cases.filter((c) => c.state === "REQUIRES_HUMAN").length} PENDING
                </div>
              </div>
            </div>
          </div>

          {/* ── Sub Navigation ── */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid var(--border)",
              backgroundColor: "var(--bg-surface)",
            }}
          >
            {(
              [
                { key: "CASES", label: `CONFLICT CASES QUEUE (${cases.length})` },
                { key: "RULES", label: `ADJUDICATION RULE HIERARCHY (${ADJUDICATION_RULES.length})` },
                { key: "SANDBOX", label: "LIVE ADJUDICATION SANDBOX" },
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
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── Tab Content ── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <AnimatePresence mode="wait">
              {/* TAB 1: CONFLICT CASES WORKSPACE */}
              {activeTab === "CASES" && (
                <motion.div
                  key="CASES"
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease }}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "360px 1fr",
                    flex: 1,
                  }}
                >
                  {/* Left List of Conflict Cases */}
                  <div style={{ borderRight: "1px solid var(--border)", overflowY: "auto" }}>
                    <div
                      style={{
                        padding: "10px 16px",
                        backgroundColor: "var(--bg-elevated)",
                        borderBottom: "1px solid var(--border-dim)",
                      }}
                    >
                      <span className="text-mono-label" style={{ color: "var(--accent)", fontSize: 10, fontWeight: 600 }}>
                        Audited Discrepancies
                      </span>
                    </div>

                    {cases.map((cs) => {
                      const isSel = cs.id === activeCase.id;
                      const sevBadge = getSeverityBadge(cs.severity);
                      const stateBadge = getStateBadge(cs.state);
                      return (
                        <button
                          key={cs.id}
                          onClick={() => setSelectedCaseId(cs.id)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "16px 20px",
                            border: "none",
                            borderTop: "1px solid var(--border-dim)",
                            background: isSel ? "var(--bg-surface)" : "transparent",
                            borderLeft: `3px solid ${isSel ? "var(--accent)" : "transparent"}`,
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span className="text-mono-data" style={{ color: isSel ? "var(--accent)" : "var(--fg-primary)", fontSize: 12, fontWeight: 500 }}>
                              {cs.id} · {cs.mpn}
                            </span>
                            <span className="badge" style={{ color: sevBadge.color, borderColor: sevBadge.color, fontSize: 8.5 }}>
                              {sevBadge.label}
                            </span>
                          </div>

                          <div className="text-mono-label" style={{ fontSize: 10, color: "var(--fg-secondary)" }}>
                            FIELD: <span style={{ color: "var(--fg-primary)" }}>{cs.field}</span>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                            <span className="text-mono-label" style={{ fontSize: 9, color: "var(--mono-meta)" }}>
                              {cs.conflictType.replace(/_/g, " ")}
                            </span>
                            <span className="badge badge-dim" style={{ fontSize: 8.5, color: stateBadge.color }}>
                              {stateBadge.label}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Right Discrepancy Comparator & Decision Trail */}
                  <div style={{ padding: "32px 36px", display: "flex", flexDirection: "column", gap: 24, overflowY: "auto" }}>
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span className="badge badge-dim">{activeCase.id}</span>
                          <span className="badge" style={{ color: "var(--accent)", borderColor: "var(--accent)" }}>
                            {activeCase.conflictType.replace(/_/g, " ")}
                          </span>
                        </div>
                        <h3 className="text-display" style={{ fontSize: "1.8rem" }}>
                          {activeCase.field} DISCREPANCY.
                        </h3>
                        <div className="text-mono-label" style={{ fontSize: 10, color: "var(--fg-secondary)", marginTop: 2 }}>
                          MPN: {activeCase.mpn} · CONSTRAINT: {activeCase.taxonomyConstraint}
                        </div>
                      </div>

                      <span
                        className="badge"
                        style={{
                          color: getStateBadge(activeCase.state).color,
                          borderColor: getStateBadge(activeCase.state).color,
                          fontSize: 10,
                        }}
                      >
                        {getStateBadge(activeCase.state).label}
                      </span>
                    </div>

                    {/* Discrepancy Matrix: Candidate A vs Candidate B */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      {/* Candidate A */}
                      <div style={{ border: "1px solid var(--border)", padding: "16px", backgroundColor: "var(--bg-root)" }}>
                        <div className="text-mono-label" style={{ fontSize: 9.5, color: "var(--fg-dim)", marginBottom: 6 }}>
                          CANDIDATE A: {activeCase.sourceA.origin}
                        </div>
                        <div className="text-mono-data" style={{ fontSize: 14, color: "var(--fg-primary)", marginBottom: 8, fontWeight: 500 }}>
                          {activeCase.sourceA.rawValue}
                        </div>
                        <div className="text-mono-label" style={{ fontSize: 9.5, color: "var(--mono-meta)" }}>
                          CONFIDENCE: {(activeCase.sourceA.confidence * 100).toFixed(0)}%
                        </div>
                        <button
                          onClick={() => applyOverride(activeCase.sourceA.rawValue, `Adopted Candidate A (${activeCase.sourceA.origin})`)}
                          className="btn-ghost"
                          style={{ marginTop: 12, width: "100%", justifyContent: "center", fontSize: 10 }}
                        >
                          ADOPT CANDIDATE A
                        </button>
                      </div>

                      {/* Candidate B */}
                      <div style={{ border: "1px solid var(--border)", padding: "16px", backgroundColor: "var(--bg-root)" }}>
                        <div className="text-mono-label" style={{ fontSize: 9.5, color: "var(--fg-dim)", marginBottom: 6 }}>
                          CANDIDATE B: {activeCase.sourceB.origin}
                        </div>
                        <div className="text-mono-data" style={{ fontSize: 14, color: "var(--status-ok)", marginBottom: 8, fontWeight: 500 }}>
                          {activeCase.sourceB.rawValue}
                        </div>
                        <div className="text-mono-label" style={{ fontSize: 9.5, color: "var(--mono-meta)" }}>
                          CONFIDENCE: {(activeCase.sourceB.confidence * 100).toFixed(0)}%
                        </div>
                        <button
                          onClick={() => applyOverride(activeCase.sourceB.rawValue, `Adopted Candidate B (${activeCase.sourceB.origin})`)}
                          className="btn-ghost"
                          style={{ marginTop: 12, width: "100%", justifyContent: "center", fontSize: 10 }}
                        >
                          ADOPT CANDIDATE B
                        </button>
                      </div>
                    </div>

                    {/* Resolved Decision Card */}
                    <div style={{ border: "1px solid var(--status-ok)", padding: "18px", backgroundColor: "rgba(74,246,38,0.03)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span className="text-mono-label" style={{ color: "var(--status-ok)", fontSize: 10, fontWeight: 600 }}>
                          Adjudicated Canonical Resolution
                        </span>
                        <span className="badge badge-dim" style={{ fontSize: 8.5 }}>
                          RULE: {activeCase.algorithmRule}
                        </span>
                      </div>

                      <div className="text-mono-data" style={{ fontSize: 16, color: "var(--status-ok)", fontWeight: "bold", marginBottom: 6 }}>
                        {activeCase.resolvedValue}
                      </div>

                      <p style={{ fontSize: 12, color: "var(--fg-secondary)", lineHeight: 1.5 }}>
                        {activeCase.algorithmDecision}
                      </p>
                    </div>

                    {/* Step-by-Step Audit Reasoning Trail */}
                    <div style={{ border: "1px solid var(--border)" }}>
                      <div
                        style={{
                          padding: "10px 16px",
                          backgroundColor: "var(--bg-elevated)",
                          borderBottom: "1px solid var(--border-dim)",
                        }}
                      >
                        <span className="text-mono-label" style={{ color: "var(--accent)", fontSize: 10, fontWeight: 600 }}>
                          Deterministic Audit Reasoning Trail
                        </span>
                      </div>

                      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
                        {activeCase.auditTrail.map((step, idx) => (
                          <div key={idx} style={{ display: "flex", gap: 10 }}>
                            <span className="text-mono-data" style={{ color: "var(--accent)", fontSize: 11, flexShrink: 0 }}>
                              {(idx + 1).toString().padStart(2, "0")}
                            </span>
                            <span className="text-mono-label" style={{ color: "var(--fg-primary)", fontSize: 11, lineHeight: 1.5 }}>
                              {step}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Custom Override Bar */}
                    <div style={{ border: "1px solid var(--border)", padding: "16px", backgroundColor: "var(--bg-surface)" }}>
                      <div className="text-mono-label" style={{ fontSize: 10, color: "var(--fg-dim)", marginBottom: 8 }}>
                        MANUAL GOVERNANCE OVERRIDE
                      </div>

                      <div style={{ display: "flex", gap: 10 }}>
                        <input
                          type="text"
                          placeholder="Type custom canonical override value..."
                          value={customOverrideVal}
                          onChange={(e) => setCustomOverrideVal(e.target.value)}
                          style={{
                            flex: 1,
                            padding: "8px 12px",
                            border: "1px solid var(--border)",
                            background: "var(--bg-root)",
                            fontFamily: "var(--font-mono)",
                            fontSize: 12,
                            color: "var(--fg-primary)",
                          }}
                        />
                        <button
                          onClick={() => {
                            applyOverride(customOverrideVal, "Manual override by Catalog Governor");
                            setCustomOverrideVal("");
                          }}
                          className="btn-primary"
                          style={{ padding: "8px 16px", fontSize: 11 }}
                        >
                          APPLY OVERRIDE
                        </button>
                      </div>

                      {overrideSuccess && (
                        <div style={{ marginTop: 8, color: "var(--status-ok)", fontSize: 11 }} className="text-mono-label">
                          ✓ Custom override applied and committed to audit log!
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: ADJUDICATION RULE HIERARCHY */}
              {activeTab === "RULES" && (
                <motion.div
                  key="RULES"
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease }}
                  style={{ padding: "36px 48px", display: "flex", flexDirection: "column", gap: 20 }}
                >
                  <div style={{ border: "1px solid var(--border)" }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "160px 180px 1fr 180px 1fr",
                        backgroundColor: "var(--bg-elevated)",
                        borderBottom: "1px solid var(--border-dim)",
                      }}
                    >
                      {["RULE CODE", "TARGET FIELD", "DETERMINISTIC PRIORITY ORDER", "TOLERANCE BOUND", "FALLBACK ESCALATION"].map((h, i) => (
                        <div
                          key={h}
                          className="text-mono-label"
                          style={{ padding: "10px 14px", fontSize: 9.5, color: "var(--fg-dim)", borderRight: i < 4 ? "1px solid var(--border-dim)" : "none" }}
                        >
                          {h}
                        </div>
                      ))}
                    </div>

                    {ADJUDICATION_RULES.map((rule) => (
                      <div
                        key={rule.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "160px 180px 1fr 180px 1fr",
                          borderTop: "1px solid var(--border-dim)",
                        }}
                      >
                        <div className="text-mono-data" style={{ padding: "14px", fontSize: 11, color: "var(--accent)", borderRight: "1px solid var(--border-dim)" }}>
                          {rule.ruleCode}
                        </div>

                        <div className="text-mono-label" style={{ padding: "14px", fontSize: 10.5, borderRight: "1px solid var(--border-dim)", color: "var(--fg-primary)" }}>
                          {rule.targetField}
                        </div>

                        <div style={{ padding: "14px", borderRight: "1px solid var(--border-dim)" }}>
                          {rule.priorityOrder.map((p) => (
                            <div key={p} className="text-mono-label" style={{ fontSize: 10, color: "var(--fg-secondary)", marginBottom: 2 }}>
                              {p}
                            </div>
                          ))}
                        </div>

                        <div className="text-mono-label" style={{ padding: "14px", fontSize: 10, color: "var(--status-ok)", borderRight: "1px solid var(--border-dim)" }}>
                          {rule.toleranceBound}
                        </div>

                        <div className="text-mono-label" style={{ padding: "14px", fontSize: 10, color: "var(--fg-secondary)", lineHeight: 1.4 }}>
                          {rule.fallbackAction}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* TAB 3: LIVE SANDBOX */}
              {activeTab === "SANDBOX" && (
                <motion.div
                  key="SANDBOX"
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease }}
                  style={{ padding: "36px 48px", display: "flex", flexDirection: "column", gap: 24 }}
                >
                  <div style={{ padding: "24px", border: "1px solid var(--border)", backgroundColor: "var(--bg-surface)" }}>
                    <span className="text-mono-label" style={{ color: "var(--accent)", fontSize: 11, fontWeight: 600 }}>
                      Test Deterministic Conflict Resolution Rules
                    </span>

                    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr auto", gap: 16, alignItems: "end" }}>
                      <div>
                        <label className="text-mono-label" style={{ fontSize: 10, display: "block", marginBottom: 4 }}>
                          FIELD NAME
                        </label>
                        <input
                          type="text"
                          value={sandField}
                          onChange={(e) => setSandField(e.target.value)}
                          className="input-underline"
                          style={{ padding: "8px", border: "1px solid var(--border)" }}
                        />
                      </div>

                      <div>
                        <label className="text-mono-label" style={{ fontSize: 10, display: "block", marginBottom: 4 }}>
                          CANDIDATE A (RAW DISTRIBUTOR TEXT)
                        </label>
                        <input
                          type="text"
                          value={sandValA}
                          onChange={(e) => setSandValA(e.target.value)}
                          className="input-underline"
                          style={{ padding: "8px", border: "1px solid var(--border)" }}
                        />
                      </div>

                      <div>
                        <label className="text-mono-label" style={{ fontSize: 10, display: "block", marginBottom: 4 }}>
                          CANDIDATE B (MFR SPECIFICATION)
                        </label>
                        <input
                          type="text"
                          value={sandValB}
                          onChange={(e) => setSandValB(e.target.value)}
                          className="input-underline"
                          style={{ padding: "8px", border: "1px solid var(--border)" }}
                        />
                      </div>

                      <button
                        onClick={() => runSandbox(sandField, sandValA, sandValB)}
                        className="btn-primary"
                        style={{ height: 38 }}
                      >
                        ADJUDICATE
                      </button>
                    </div>
                  </div>

                  {sandResult && (
                    <div style={{ border: "1px solid var(--border)", padding: "24px" }}>
                      <span className="text-mono-label" style={{ color: "var(--status-ok)", fontSize: 10, fontWeight: 600 }}>
                      Adjudication Engine Verdict
                    </span>

                      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20 }}>
                        <div style={{ borderRight: "1px solid var(--border-dim)", paddingRight: 20 }}>
                          <div className="text-mono-label" style={{ fontSize: 9.5, color: "var(--fg-dim)" }}>
                            RESOLVED VALUE
                          </div>
                          <div className="text-mono-data" style={{ fontSize: 18, color: "var(--status-ok)", fontWeight: "bold", marginTop: 4 }}>
                            {sandResult.resolvedValue}
                          </div>
                          <div className="badge badge-dim" style={{ marginTop: 8, fontSize: 9 }}>
                            {sandResult.rule}
                          </div>
                        </div>

                        <div>
                          <div className="text-mono-label" style={{ fontSize: 9.5, color: "var(--fg-dim)" }}>
                            REASONING & PROVENANCE WEIGHT
                          </div>
                          <p style={{ fontSize: 13, color: "var(--fg-primary)", marginTop: 6, lineHeight: 1.5 }}>
                            {sandResult.reasoning}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </>
  );
}
