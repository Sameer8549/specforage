"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import Link from "next/link";
import {
  QUALITY_SCORECARD_DATA,
  INITIAL_REVIEW_QUEUE,
  INITIAL_AUDIT_LOGS,
  ReviewQueueItem,
  AuditLogEvent,
} from "@/data/auditData";
import {
  ShieldCheck,
  CheckCircle,
  Warning,
  Prohibit,
  Check,
  X,
  MagnifyingGlass,
  DownloadSimple,
  Copy,
  Sliders,
  Sparkle,
  TreeStructure,
  Gavel,
  FileCode,
} from "@phosphor-icons/react";

function getFlagTypeBadge(type: ReviewQueueItem["flagType"]) {
  if (type === "INFERRED_BRAND") return { color: "var(--status-warn)", label: "INFERRED BRAND" };
  if (type === "UNVERIFIED_EVIDENCE") return { color: "var(--accent)", label: "UNVERIFIED EVIDENCE" };
  if (type === "FIRST_SEEN_VOCAB") return { color: "var(--status-ok)", label: "FIRST SEEN VOCAB" };
  return { color: "var(--fg-secondary)", label: "UOM CONVERSION" };
}

function getLogSeverityBadge(sev: AuditLogEvent["severity"]) {
  if (sev === "INFO") return { color: "var(--status-ok)", label: "INFO" };
  if (sev === "WARN") return { color: "var(--status-warn)", label: "WARN" };
  return { color: "var(--accent)", label: "CRITICAL" };
}

export default function AuditPage() {
  const [activeTab, setActiveTab] = useState<"SCORECARD" | "QUEUE" | "LOGS">("SCORECARD");
  const [queue, setQueue] = useState<ReviewQueueItem[]>(INITIAL_REVIEW_QUEUE);
  const [logs, setLogs] = useState<AuditLogEvent[]>(INITIAL_AUDIT_LOGS);
  const [searchLog, setSearchLog] = useState("");
  const [logSeverityFilter, setLogSeverityFilter] = useState("ALL");
  const [copiedReport, setCopiedReport] = useState(false);

  const reduce = useReducedMotion();
  const ease = [0.16, 1, 0.3, 1] as const;

  const pendingQueue = queue.filter((q) => q.status === "PENDING");

  function handleQueueAction(id: string, action: "APPROVED" | "DISMISSED") {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: action } : item))
    );

    // Append to audit log
    const target = queue.find((q) => q.id === id);
    if (target) {
      setLogs((prev) => [
        {
          id: `LOG-${Date.now().toString().slice(-4)}`,
          timestamp: new Date().toISOString(),
          agentOrSystem: "Catalog Governor",
          mpn: target.mpn,
          eventType: "GOVERNANCE_OVERRIDE",
          severity: "INFO",
          details: `Manual review action '${action}' applied to field ${target.field} (${target.proposedValue}).`,
        },
        ...prev,
      ]);
    }
  }

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchSev = logSeverityFilter === "ALL" || log.severity === logSeverityFilter;
      const q = searchLog.toLowerCase();
      const matchSearch =
        !searchLog.trim() ||
        log.mpn.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.agentOrSystem.toLowerCase().includes(q) ||
        log.eventType.toLowerCase().includes(q);

      return matchSev && matchSearch;
    });
  }, [logs, logSeverityFilter, searchLog]);

  function exportReport() {
    const report = {
      generatedAt: new Date().toISOString(),
      scorecard: QUALITY_SCORECARD_DATA,
      activeReviewQueue: queue,
      recentAuditLogs: logs,
    };
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `specforge_quality_audit_dossier_${Date.now()}.json`);
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
                Quality Audit & Compliance Dossier
              </div>
              <h1
                className="text-display"
                style={{ fontSize: "clamp(2rem, 3.5vw, 3.2rem)" }}
              >
                QUALITY SCORECARD.
              </h1>
            </div>

            {/* Quick Actions */}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                onClick={exportReport}
                className="btn-primary"
                style={{ padding: "8px 16px", fontSize: 11 }}
              >
                <DownloadSimple size={14} weight="bold" />
                DOWNLOAD AUDIT DOSSIER
              </button>
            </div>
          </div>

          {/* ── Navigation Tabs ── */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid var(--border)",
              backgroundColor: "var(--bg-surface)",
            }}
          >
            {(
              [
                { key: "SCORECARD", label: "QUALITY & COVERAGE SCORECARD" },
                { key: "QUEUE", label: `HUMAN REVIEW QUEUE (${pendingQueue.length} PENDING)` },
                { key: "LOGS", label: `SYSTEM AUDIT EVENT LOG (${logs.length})` },
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
          <div style={{ padding: "36px 48px", flex: 1 }}>
            <AnimatePresence mode="wait">
              {/* TAB 1: SCORECARD DASHBOARD */}
              {activeTab === "SCORECARD" && (
                <motion.div
                  key="SCORECARD"
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease }}
                  style={{ display: "flex", flexDirection: "column", gap: 32 }}
                >
                  {/* 4 Core Pillars */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                    {[
                      {
                        title: "UNSPSC CLASSIFICATION",
                        pct: QUALITY_SCORECARD_DATA.taxonomyCoveragePercent,
                        sub: "4,743 of 4,820 rows mapped to 8-digit code",
                        color: "var(--status-ok)",
                      },
                      {
                        title: "ATTRIBUTE FILL RATE",
                        pct: QUALITY_SCORECARD_DATA.attributeFillRatePercent,
                        sub: "Governed properties populated per commodity",
                        color: "var(--status-ok)",
                      },
                      {
                        title: "AVERAGE CONFIDENCE",
                        pct: QUALITY_SCORECARD_DATA.averageConfidencePercent,
                        sub: "Weighted extraction & resolution score",
                        color: "var(--status-ok)",
                      },
                      {
                        title: "FACTUAL ENTAILMENT",
                        pct: QUALITY_SCORECARD_DATA.entailmentRatioPercent,
                        sub: "Zero hallucination proof vs. mfr authority",
                        color: "var(--status-ok)",
                      },
                    ].map((pillar) => (
                      <div
                        key={pillar.title}
                        style={{
                          border: "1px solid var(--border)",
                          padding: "20px",
                          backgroundColor: "var(--bg-surface)",
                        }}
                      >
                        <div className="text-mono-label" style={{ fontSize: 11.5, color: "var(--fg-dim)", marginBottom: 8 }}>
                          {pillar.title}
                        </div>

                        <div className="text-display" style={{ fontSize: "2.4rem", color: pillar.color, marginBottom: 8 }}>
                          {pillar.pct}%
                        </div>

                        <div style={{ height: 2, backgroundColor: "var(--border)", position: "relative", marginBottom: 8 }}>
                          <div
                            style={{
                              position: "absolute",
                              left: 0,
                              top: 0,
                              height: "100%",
                              width: `${pillar.pct}%`,
                              backgroundColor: pillar.color,
                            }}
                          />
                        </div>

                        <div className="text-mono-label" style={{ fontSize: 11.5, color: "var(--fg-secondary)", lineHeight: 1.4 }}>
                          {pillar.sub}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Catalog Integrity Breakdown */}
                  <div style={{ border: "1px solid var(--border)", padding: "24px", backgroundColor: "var(--bg-surface)" }}>
                    <span className="text-mono-label" style={{ color: "var(--accent)", fontSize: 11, fontWeight: 600 }}>
                      Enterprise Catalog Integrity Breakdown
                    </span>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
                      <div>
                        <div className="text-mono-label" style={{ fontSize: 12, color: "var(--mono-meta)" }}>
                          TOTAL CATALOG ROWS
                        </div>
                        <div className="text-mono-data" style={{ fontSize: 16, color: "var(--fg-primary)", marginTop: 4 }}>
                          {QUALITY_SCORECARD_DATA.totalCatalogRows.toLocaleString()} ROWS
                        </div>
                      </div>

                      <div>
                        <div className="text-mono-label" style={{ fontSize: 12, color: "var(--status-ok)" }}>
                          VERIFIED STRUCTURED RECORDS
                        </div>
                        <div className="text-mono-data" style={{ fontSize: 16, color: "var(--status-ok)", marginTop: 4 }}>
                          {QUALITY_SCORECARD_DATA.verifiedRecords.toLocaleString()} (95.2%)
                        </div>
                      </div>

                      <div>
                        <div className="text-mono-label" style={{ fontSize: 12, color: "var(--status-warn)" }}>
                          HUMAN REVIEW QUEUE
                        </div>
                        <div className="text-mono-data" style={{ fontSize: 16, color: "var(--status-warn)", marginTop: 4 }}>
                          {QUALITY_SCORECARD_DATA.flaggedForReview} (3.8%)
                        </div>
                      </div>

                      <div>
                        <div className="text-mono-label" style={{ fontSize: 12, color: "var(--accent)" }}>
                          STRIPPED PLACEHOLDERS
                        </div>
                        <div className="text-mono-data" style={{ fontSize: 16, color: "var(--accent)", marginTop: 4 }}>
                          {QUALITY_SCORECARD_DATA.rejectedPlaceholders} DROPPED (1.0%)
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: HUMAN REVIEW QUEUE */}
              {activeTab === "QUEUE" && (
                <motion.div
                  key="QUEUE"
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease }}
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  <div style={{ border: "1px solid var(--border)", overflowX: "auto" }}>
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
                        Pending Catalog Governance Queue
                      </span>
                      <span className="text-mono-label" style={{ fontSize: 12 }}>
                        {pendingQueue.length} ITEMS AWAITING DECISION
                      </span>
                    </div>

                    <div style={{ minWidth: 960 }}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "100px 120px 130px 160px 1fr 210px",
                          backgroundColor: "var(--bg-surface)",
                          borderBottom: "1px solid var(--border-dim)",
                        }}
                      >
                        {["CASE ID", "MPN", "FIELD", "PROPOSED VALUE", "FLAG REASON", "GOVERNOR ACTION"].map((h, i) => (
                          <div
                            key={h}
                            className="text-mono-label"
                            style={{ padding: "10px 12px", fontSize: 11.5, color: "var(--fg-dim)", borderRight: i < 5 ? "1px solid var(--border-dim)" : "none" }}
                          >
                            {h}
                          </div>
                        ))}
                      </div>

                      {queue.map((item) => {
                        const flagBadge = getFlagTypeBadge(item.flagType);
                        const isPending = item.status === "PENDING";

                        return (
                          <div
                            key={item.id}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "100px 120px 130px 160px 1fr 210px",
                              borderTop: "1px solid var(--border-dim)",
                              opacity: isPending ? 1 : 0.6,
                            }}
                          >
                            {/* ID */}
                            <div className="text-mono-data" style={{ padding: "14px 12px", fontSize: 11, borderRight: "1px solid var(--border-dim)", color: "var(--fg-dim)" }}>
                              {item.id}
                            </div>

                            {/* MPN */}
                            <div className="text-mono-data" style={{ padding: "14px 12px", fontSize: 11.5, color: "var(--accent)", fontWeight: 500, borderRight: "1px solid var(--border-dim)" }}>
                              {item.mpn}
                            </div>

                            {/* Field */}
                            <div className="text-mono-label" style={{ padding: "14px 12px", fontSize: 12, borderRight: "1px solid var(--border-dim)", color: "var(--fg-primary)" }}>
                              {item.field}
                            </div>

                            {/* Value */}
                            <div className="text-mono-data" style={{ padding: "14px 12px", fontSize: 11, color: "var(--status-ok)", borderRight: "1px solid var(--border-dim)" }}>
                              {item.proposedValue}
                            </div>

                            {/* Reason */}
                            <div style={{ padding: "14px 12px", borderRight: "1px solid var(--border-dim)" }}>
                              <span className="badge" style={{ color: flagBadge.color, borderColor: flagBadge.color, fontSize: 11, marginBottom: 4 }}>
                                {flagBadge.label}
                              </span>
                              <p className="text-mono-label" style={{ fontSize: 11.5, color: "var(--fg-secondary)", lineHeight: 1.4 }}>
                                {item.reason}
                              </p>
                            </div>

                            {/* Action */}
                            <div style={{ padding: "14px 12px", display: "flex", alignItems: "center", gap: 8, flexWrap: "nowrap" }}>
                              {isPending ? (
                                <>
                                  <button
                                    onClick={() => handleQueueAction(item.id, "APPROVED")}
                                    className="btn-primary"
                                    style={{ padding: "5px 10px", fontSize: 11, flexShrink: 0 }}
                                  >
                                    <Check size={12} weight="bold" />
                                    CONFIRM
                                  </button>
                                  <button
                                    onClick={() => handleQueueAction(item.id, "DISMISSED")}
                                    className="btn-ghost"
                                    style={{ padding: "5px 10px", fontSize: 11, flexShrink: 0 }}
                                  >
                                    <X size={12} />
                                    DISMISS
                                  </button>
                                </>
                              ) : (
                                <span className="text-mono-label" style={{ fontSize: 11.5, color: item.status === "APPROVED" ? "var(--status-ok)" : "var(--accent)" }}>
                                  {item.status === "APPROVED" ? "✓ CONFIRMED" : "✕ DISMISSED"}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 3: AUDIT EVENT STREAM */}
              {activeTab === "LOGS" && (
                <motion.div
                  key="LOGS"
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease }}
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--border)", padding: "6px 0", minWidth: 320 }}>
                      <MagnifyingGlass size={14} style={{ color: "var(--fg-dim)" }} />
                      <input
                        type="text"
                        placeholder="FILTER AUDIT LOG (MPN, EVENT, DETAIL)..."
                        value={searchLog}
                        onChange={(e) => setSearchLog(e.target.value)}
                        style={{
                          background: "transparent",
                          border: "none",
                          outline: "none",
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--fg-primary)",
                          width: "100%",
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span className="text-mono-label" style={{ fontSize: 11.5 }}>SEVERITY:</span>
                      {["ALL", "INFO", "WARN", "CRITICAL"].map((s) => {
                        const active = logSeverityFilter === s;
                        return (
                          <button
                            key={s}
                            onClick={() => setLogSeverityFilter(s)}
                            style={{
                              background: active ? "var(--fg-primary)" : "transparent",
                              color: active ? "var(--bg-root)" : "var(--fg-secondary)",
                              border: "1px solid var(--border)",
                              padding: "3px 8px",
                              fontFamily: "var(--font-mono)",
                              fontSize: 11.5,
                              cursor: "pointer",
                            }}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ border: "1px solid var(--border)" }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "110px 180px 120px 140px 1fr 80px",
                        backgroundColor: "var(--bg-elevated)",
                        borderBottom: "1px solid var(--border-dim)",
                      }}
                    >
                      {["LOG ID", "TIMESTAMP", "ACTOR / SERVICE", "MPN", "EVENT DETAILS", "SEV"].map((h, i) => (
                        <div
                          key={h}
                          className="text-mono-label"
                          style={{ padding: "10px 12px", fontSize: 11.5, color: "var(--fg-dim)", borderRight: i < 5 ? "1px solid var(--border-dim)" : "none" }}
                        >
                          {h}
                        </div>
                      ))}
                    </div>

                    {filteredLogs.map((log) => {
                      const sevBadge = getLogSeverityBadge(log.severity);
                      return (
                        <div
                          key={log.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "110px 180px 120px 140px 1fr 80px",
                            borderTop: "1px solid var(--border-dim)",
                          }}
                        >
                          <div className="text-mono-data" style={{ padding: "12px", fontSize: 12, borderRight: "1px solid var(--border-dim)", color: "var(--fg-dim)" }}>
                            {log.id}
                          </div>

                          <div className="text-mono-data" style={{ padding: "12px", fontSize: 12, borderRight: "1px solid var(--border-dim)", color: "var(--mono-meta)" }}>
                            {log.timestamp.replace("T", " ").replace("Z", "")}
                          </div>

                          <div className="text-mono-label" style={{ padding: "12px", fontSize: 12, borderRight: "1px solid var(--border-dim)", color: "var(--fg-primary)" }}>
                            {log.agentOrSystem}
                          </div>

                          <div className="text-mono-data" style={{ padding: "12px", fontSize: 11, borderRight: "1px solid var(--border-dim)", color: "var(--accent)" }}>
                            {log.mpn}
                          </div>

                          <div className="text-mono-label" style={{ padding: "12px", fontSize: 12, borderRight: "1px solid var(--border-dim)", color: "var(--fg-secondary)", lineHeight: 1.4 }}>
                            {log.details}
                          </div>

                          <div style={{ padding: "12px", display: "flex", alignItems: "center" }}>
                            <span className="badge" style={{ color: sevBadge.color, borderColor: sevBadge.color, fontSize: 11 }}>
                              {sevBadge.label}
                            </span>
                          </div>
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
