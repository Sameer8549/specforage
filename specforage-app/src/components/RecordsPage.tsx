"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import Link from "next/link";
import {
  SAMPLE_RECORDS,
  ProductRecord,
  AttributeItem,
  DescriptionVariant,
} from "@/data/sampleRecords";
import {
  MagnifyingGlass,
  CheckCircle,
  Warning,
  Copy,
  Check,
  DownloadSimple,
  ArrowRight,
  CaretRight,
  ShieldCheck,
  FileCode,
  TreeStructure,
} from "@phosphor-icons/react";

function getStatusBadge(status: ProductRecord["reviewStatus"]) {
  if (status === "VERIFIED") {
    return { color: "var(--status-ok)", label: "VERIFIED" };
  }
  if (status === "REQUIRES REVIEW") {
    return { color: "var(--status-warn)", label: "REQUIRES REVIEW" };
  }
  return { color: "var(--accent)", label: "REJECTED" };
}

function getVocabColor(vocab: AttributeItem["vocabState"]) {
  if (vocab === "MATCHED") return "var(--status-ok)";
  if (vocab === "FIRST SEEN") return "var(--status-warn)";
  return "var(--accent)";
}

export default function RecordsPage() {
  const [selectedRecordId, setSelectedRecordId] = useState<string>(
    SAMPLE_RECORDS[0].id
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"PROVENANCE" | "DESCRIPTIONS" | "ADJUDICATION" | "EXPORT">("PROVENANCE");

  const reduce = useReducedMotion();
  const ease = [0.16, 1, 0.3, 1] as const;

  // Filtered records list
  const filteredRecords = useMemo(() => {
    return SAMPLE_RECORDS.filter((rec) => {
      const matchSearch =
        searchQuery.trim() === "" ||
        rec.mpn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.canonicalManufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.unspscCode.includes(searchQuery) ||
        rec.commodity.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCat =
        categoryFilter === "ALL" ||
        (categoryFilter === "PLUMBING" && rec.unspscCode.startsWith("401")) ||
        (categoryFilter === "ELECTRICAL" && rec.unspscCode.startsWith("391")) ||
        (categoryFilter === "APPLIANCES" && rec.unspscCode.startsWith("4018"));

      const matchStatus =
        statusFilter === "ALL" || rec.reviewStatus === statusFilter;

      return matchSearch && matchCat && matchStatus;
    });
  }, [searchQuery, categoryFilter, statusFilter]);

  const activeRecord = useMemo(() => {
    return (
      SAMPLE_RECORDS.find((r) => r.id === selectedRecordId) || SAMPLE_RECORDS[0]
    );
  }, [selectedRecordId]);

  function copyToClipboard(text: string, type: string) {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  }

  function downloadJson(record: ProductRecord) {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(record, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${record.mpn}_specforge_record.json`);
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
          {/* ── Top Header & Stats ── */}
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
                Verified Intelligence Records
              </div>
              <h1
                className="text-display"
                style={{ fontSize: "clamp(2rem, 3.5vw, 3.2rem)" }}
              >
                STRUCTURED CATALOG.
              </h1>
            </div>

            {/* Quick Metrics */}
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
                  CATALOG DEPTH
                </div>
                <div className="text-mono-data" style={{ fontSize: 18, color: "var(--fg-primary)", marginTop: 4 }}>
                  {SAMPLE_RECORDS.length} RECORDS
                </div>
              </div>
              <div>
                <div className="text-mono-label" style={{ fontSize: 10, color: "var(--fg-dim)" }}>
                  AVG CONFIDENCE
                </div>
                <div className="text-mono-data" style={{ fontSize: 18, color: "var(--status-ok)", marginTop: 4 }}>
                  97.0%
                </div>
              </div>
              <div>
                <div className="text-mono-label" style={{ fontSize: 10, color: "var(--fg-dim)" }}>
                  REVIEW QUEUE
                </div>
                <div className="text-mono-data" style={{ fontSize: 18, color: "var(--status-warn)", marginTop: 4 }}>
                  1 FLAGGED
                </div>
              </div>
            </div>
          </div>

          {/* ── Search & Filtering Bar ── */}
          <div
            style={{
              padding: "16px 48px",
              borderBottom: "1px solid var(--border)",
              backgroundColor: "var(--bg-surface)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            {/* Search Input */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                borderBottom: "1px solid var(--border)",
                padding: "6px 0",
                minWidth: 320,
              }}
            >
              <MagnifyingGlass size={14} style={{ color: "var(--fg-dim)" }} />
              <input
                type="text"
                placeholder="SEARCH MPN, BRAND, UNSPSC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--fg-primary)",
                  width: "100%",
                }}
              />
            </div>

            {/* Filter buttons */}
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <span className="text-mono-label" style={{ fontSize: 10 }}>CATEGORY:</span>
              {(["ALL", "PLUMBING", "ELECTRICAL", "APPLIANCES"] as const).map((cat) => {
                const active = categoryFilter === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    style={{
                      background: active ? "var(--fg-primary)" : "transparent",
                      color: active ? "var(--bg-root)" : "var(--fg-secondary)",
                      border: "1px solid var(--border)",
                      padding: "4px 10px",
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.06em",
                      cursor: "pointer",
                    }}
                  >
                    {cat}
                  </button>
                );
              })}

              <span className="text-mono-label" style={{ fontSize: 10, marginLeft: 8 }}>STATUS:</span>
              {(["ALL", "VERIFIED", "REQUIRES REVIEW"] as const).map((st) => {
                const active = statusFilter === st;
                return (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    style={{
                      background: active ? "var(--fg-primary)" : "transparent",
                      color: active ? "var(--bg-root)" : "var(--fg-secondary)",
                      border: "1px solid var(--border)",
                      padding: "4px 10px",
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.06em",
                      cursor: "pointer",
                    }}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Main Split View: Left List / Right Detail ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "380px 1fr",
              flex: 1,
            }}
          >
            {/* ── LEFT: Record Browser List ── */}
            <div
              style={{
                borderRight: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                overflowY: "auto",
                maxHeight: "calc(100vh - 220px)",
              }}
            >
              <div
                style={{
                  padding: "10px 16px",
                  borderBottom: "1px solid var(--border-dim)",
                  backgroundColor: "var(--bg-elevated)",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span className="text-mono-label" style={{ fontSize: 10 }}>CATALOG ROWS ({filteredRecords.length})</span>
                <span className="text-mono-label" style={{ fontSize: 10, color: "var(--accent)" }}>SELECT TO INSPECT</span>
              </div>

              {filteredRecords.length === 0 ? (
                <div style={{ padding: "40px 24px", textAlign: "center" }}>
                  <span className="text-mono-label" style={{ color: "var(--fg-dim)" }}>
                    NO MATCHING RECORDS
                  </span>
                </div>
              ) : (
                filteredRecords.map((rec) => {
                  const isSelected = rec.id === activeRecord.id;
                  const badgeInfo = getStatusBadge(rec.reviewStatus);
                  return (
                    <button
                      key={rec.id}
                      onClick={() => setSelectedRecordId(rec.id)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        background: isSelected ? "var(--bg-surface)" : "transparent",
                        border: "none",
                        borderTop: "1px solid var(--border-dim)",
                        borderLeft: `3px solid ${isSelected ? "var(--accent)" : "transparent"}`,
                        padding: "16px 20px",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        transition: "background 120ms ease",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className="text-mono-data" style={{ color: isSelected ? "var(--accent)" : "var(--fg-primary)", fontSize: 13, fontWeight: 500 }}>
                          {rec.mpn}
                        </span>
                        <span
                          className="badge"
                          style={{
                            color: badgeInfo.color,
                            borderColor: badgeInfo.color,
                            fontSize: 9,
                          }}
                        >
                          {badgeInfo.label}
                        </span>
                      </div>

                      <div className="text-mono-data" style={{ fontSize: 11, color: "var(--fg-secondary)" }}>
                        {rec.brand} · {rec.canonicalManufacturer}
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                        <span className="text-mono-label" style={{ fontSize: 9, color: "var(--mono-meta)" }}>
                          UNSPSC {rec.unspscCode}
                        </span>
                        <span className="text-mono-label" style={{ fontSize: 9, color: "var(--status-ok)" }}>
                          {Math.round(rec.overallConfidence * 100)}% CONF
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* ── RIGHT: Record Deep Inspection Inspector ── */}
            <div style={{ display: "flex", flexDirection: "column", overflowY: "auto" }}>
              {/* Record Summary Banner */}
              <div
                style={{
                  padding: "24px 36px",
                  borderBottom: "1px solid var(--border)",
                  backgroundColor: "var(--bg-surface)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <span className="badge badge-dim">{activeRecord.id}</span>
                      <span className="text-mono-label" style={{ color: "var(--accent)", fontSize: 11 }}>
                        UNSPSC {activeRecord.unspscCode}
                      </span>
                      {activeRecord.brandInferred && (
                        <span className="badge" style={{ color: "var(--status-warn)", borderColor: "var(--status-warn)" }}>
                          BRAND INFERRED
                        </span>
                      )}
                    </div>
                    <h2 className="text-display" style={{ fontSize: "2rem", marginBottom: 6 }}>
                      {activeRecord.mpn}
                    </h2>
                    <div className="text-mono-data" style={{ fontSize: 12, color: "var(--fg-secondary)" }}>
                      {activeRecord.commodity}
                    </div>
                  </div>

                  {/* Top Actions */}
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(activeRecord, null, 2), "ALL_JSON")}
                      className="btn-ghost"
                      style={{ padding: "8px 14px", fontSize: 11 }}
                    >
                      {copiedType === "ALL_JSON" ? <Check size={14} style={{ color: "var(--status-ok)" }} /> : <Copy size={14} />}
                      {copiedType === "ALL_JSON" ? "COPIED JSON" : "COPY JSON"}
                    </button>
                    <button
                      onClick={() => downloadJson(activeRecord)}
                      className="btn-primary"
                      style={{ padding: "8px 16px", fontSize: 11 }}
                    >
                      <DownloadSimple size={14} weight="bold" />
                      EXPORT RECORD
                    </button>
                  </div>
                </div>

                {/* Classpath Breadcrumbs */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 16,
                    paddingTop: 12,
                    borderTop: "1px solid var(--border-dim)",
                    flexWrap: "wrap",
                  }}
                >
                  <TreeStructure size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
                  <span className="text-mono-label" style={{ fontSize: 10, color: "var(--mono-meta)" }}>CLASSPATH:</span>
                  <span className="text-mono-data" style={{ fontSize: 11, color: "var(--fg-secondary)" }}>
                    {activeRecord.unspscClasspath}
                  </span>
                </div>
              </div>

              {/* Inspector View Navigation Tabs */}
              <div
                style={{
                  display: "flex",
                  borderBottom: "1px solid var(--border)",
                  backgroundColor: "var(--bg-root)",
                }}
              >
                {(
                  [
                    { key: "PROVENANCE", label: "PROVENANCE & ATTRIBUTES" },
                    { key: "DESCRIPTIONS", label: "DESCRIPTION SUITE (6)" },
                    { key: "ADJUDICATION", label: `ADJUDICATION LOG (${activeRecord.adjudicationLog.length})` },
                    { key: "EXPORT", label: "DELIVERY FORMAT MAPPING" },
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
                        transition: "color 150ms ease",
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab View Container */}
              <div style={{ padding: "32px 36px", flex: 1 }}>
                <AnimatePresence mode="wait">
                  {/* TAB 1: PROVENANCE MATRIX */}
                  {activeTab === "PROVENANCE" && (
                    <motion.div
                      key="PROVENANCE"
                      initial={reduce ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3, ease }}
                      style={{ display: "flex", flexDirection: "column", gap: 24 }}
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
                          <span className="text-mono-label" style={{ color: "var(--accent)", fontSize: 10 }}>
                            Attribute Provenance & Entailment Matrix
                          </span>
                          <span className="text-mono-label" style={{ fontSize: 10 }}>
                            {activeRecord.attributes.length} GOVERNED ATTRIBUTES
                          </span>
                        </div>

                        {/* Table Header */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "150px 140px 1fr 180px 80px 110px",
                            borderBottom: "1px solid var(--border)",
                            backgroundColor: "var(--bg-surface)",
                          }}
                        >
                          {["ATTRIBUTE", "RAW EXTRACT", "NORMALIZED VALUE", "PROVENANCE SOURCE", "CONF.", "VOCAB STATUS"].map((h, i) => (
                            <div
                              key={h}
                              className="text-mono-label"
                              style={{
                                padding: "9px 12px",
                                fontSize: 9.5,
                                color: "var(--fg-dim)",
                                borderRight: i < 5 ? "1px solid var(--border-dim)" : "none",
                              }}
                            >
                              {h}
                            </div>
                          ))}
                        </div>

                        {/* Rows */}
                        {activeRecord.attributes.map((attr, idx) => {
                          const vocabColor = getVocabColor(attr.vocabState);
                          return (
                            <div
                              key={attr.name}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "150px 140px 1fr 180px 80px 110px",
                                borderTop: idx > 0 ? "1px solid var(--border-dim)" : "none",
                              }}
                            >
                              {/* Name */}
                              <div className="text-mono-label" style={{ padding: "10px 12px", fontSize: 10, borderRight: "1px solid var(--border-dim)", color: "var(--fg-secondary)" }}>
                                {attr.name}
                              </div>
                              {/* Raw */}
                              <div className="text-mono-data" style={{ padding: "10px 12px", fontSize: 11, borderRight: "1px solid var(--border-dim)", color: "var(--fg-dim)" }}>
                                {attr.rawValue}
                              </div>
                              {/* Normalized */}
                              <div className="text-mono-data" style={{ padding: "10px 12px", fontSize: 12, borderRight: "1px solid var(--border-dim)", color: "var(--fg-primary)" }}>
                                {attr.normalizedValue}
                              </div>
                              {/* Source */}
                              <div style={{ padding: "10px 12px", borderRight: "1px solid var(--border-dim)" }}>
                                <span
                                  className="text-mono-label"
                                  style={{
                                    fontSize: 9,
                                    color: attr.source.startsWith("site:") ? "var(--status-ok)" : "var(--fg-secondary)",
                                  }}
                                >
                                  {attr.source}
                                </span>
                              </div>
                              {/* Conf */}
                              <div className="text-mono-data" style={{ padding: "10px 12px", fontSize: 11, borderRight: "1px solid var(--border-dim)", color: attr.confidence >= 0.95 ? "var(--status-ok)" : "var(--status-warn)" }}>
                                {(attr.confidence * 100).toFixed(0)}%
                              </div>
                              {/* Vocab status */}
                              <div style={{ padding: "10px 12px", display: "flex", alignItems: "center" }}>
                                <span
                                  className="badge"
                                  style={{
                                    color: vocabColor,
                                    borderColor: vocabColor,
                                    fontSize: 8.5,
                                  }}
                                >
                                  {attr.vocabState}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 2: MULTI-FORMAT DESCRIPTION SUITE */}
                  {activeTab === "DESCRIPTIONS" && (
                    <motion.div
                      key="DESCRIPTIONS"
                      initial={reduce ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3, ease }}
                      style={{ display: "flex", flexDirection: "column", gap: 16 }}
                    >
                      <div
                        style={{
                          padding: "12px 16px",
                          border: "1px solid var(--border)",
                          backgroundColor: "var(--bg-surface)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span className="text-mono-label" style={{ color: "var(--accent)", fontSize: 10 }}>
                          Formula-Generated Channel Variants
                        </span>
                        <span className="text-mono-label" style={{ fontSize: 10 }}>
                          NO FREE-TEXT HALLUCINATIONS
                        </span>
                      </div>

                      {activeRecord.descriptions.map((desc) => {
                        const len = desc.text.length;
                        const pct = (len / desc.limit) * 100;
                        const isCopied = copiedType === desc.type;
                        return (
                          <div
                            key={desc.type}
                            style={{
                              border: "1px solid var(--border)",
                              backgroundColor: "var(--bg-root)",
                            }}
                          >
                            <div
                              style={{
                                padding: "8px 14px",
                                backgroundColor: "var(--bg-elevated)",
                                borderBottom: "1px solid var(--border-dim)",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span className="text-mono-label" style={{ fontSize: 10, color: "var(--fg-primary)" }}>
                                  {desc.type}
                                </span>
                                <span className="badge badge-dim" style={{ fontSize: 8.5 }}>
                                  LIMIT: {desc.limit}
                                </span>
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <span
                                  className="text-mono-label"
                                  style={{
                                    fontSize: 9.5,
                                    color: len <= desc.limit ? "var(--status-ok)" : "var(--accent)",
                                  }}
                                >
                                  {len} / {desc.limit} CHARACTERS
                                </span>
                                <button
                                  onClick={() => copyToClipboard(desc.text, desc.type)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: isCopied ? "var(--status-ok)" : "var(--fg-secondary)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                    fontFamily: "var(--font-mono)",
                                    fontSize: 10,
                                  }}
                                >
                                  {isCopied ? <Check size={12} /> : <Copy size={12} />}
                                  {isCopied ? "COPIED" : "COPY"}
                                </button>
                              </div>
                            </div>

                            <div style={{ padding: "14px 16px" }}>
                              <p
                                style={{
                                  fontSize: 13,
                                  lineHeight: 1.6,
                                  color: "var(--fg-primary)",
                                  fontFamily: desc.type === "INVOICE" ? "var(--font-mono)" : "var(--font-body)",
                                  marginBottom: 10,
                                }}
                              >
                                {desc.text}
                              </p>

                              {/* Progress visual */}
                              <div style={{ height: 2, backgroundColor: "var(--border)", position: "relative" }}>
                                <div
                                  style={{
                                    position: "absolute",
                                    left: 0,
                                    top: 0,
                                    height: "100%",
                                    width: `${Math.min(pct, 100)}%`,
                                    backgroundColor: len <= desc.limit ? "var(--status-ok)" : "var(--accent)",
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}

                  {/* TAB 3: ADJUDICATION LOG */}
                  {activeTab === "ADJUDICATION" && (
                    <motion.div
                      key="ADJUDICATION"
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
                          }}
                        >
                          <span className="text-mono-label" style={{ color: "var(--accent)", fontSize: 10 }}>
                            Deterministic Conflict Resolution Log
                          </span>
                        </div>

                        {activeRecord.adjudicationLog.map((log) => (
                          <div
                            key={log.step}
                            style={{
                              padding: "16px",
                              borderBottom: "1px solid var(--border-dim)",
                              display: "grid",
                              gridTemplateColumns: "60px 140px 1fr",
                              gap: 16,
                            }}
                          >
                            <span className="text-mono-data" style={{ color: "var(--accent)", fontSize: 11 }}>
                              STEP {log.step}
                            </span>
                            <div>
                              <div className="text-mono-label" style={{ fontSize: 10, color: "var(--fg-secondary)" }}>
                                {log.field}
                              </div>
                              <span className="badge" style={{ color: "var(--status-warn)", borderColor: "var(--status-warn)", fontSize: 8.5, marginTop: 4 }}>
                                {log.action}
                              </span>
                            </div>
                            <div>
                              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                                <span className="text-mono-data" style={{ fontSize: 11, color: "var(--fg-dim)", textDecoration: "line-through" }}>
                                  {log.rawInput}
                                </span>
                                <ArrowRight size={12} style={{ color: "var(--accent)" }} />
                                <span className="text-mono-data" style={{ fontSize: 12, color: "var(--status-ok)" }}>
                                  {log.resolvedValue}
                                </span>
                              </div>
                              <div className="text-mono-label" style={{ fontSize: 10, color: "var(--fg-secondary)", lineHeight: 1.4 }}>
                                {log.reason}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 4: DELIVERY FORMAT EXPORT PREVIEW */}
                  {activeTab === "EXPORT" && (
                    <motion.div
                      key="EXPORT"
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
                          <span className="text-mono-label" style={{ color: "var(--status-ok)", fontSize: 10 }}>
                            Delivery Format Column Mapping
                          </span>
                          <span className="text-mono-label" style={{ fontSize: 10 }}>
                            READY FOR COMMERCE INGESTION
                          </span>
                        </div>

                        {[
                          { col: "ITEM_ID", val: activeRecord.id },
                          { col: "MFR_PART_NUMBER", val: activeRecord.mpn },
                          { col: "UPC_GTIN", val: activeRecord.upc || "—" },
                          { col: "BRAND_NAME", val: activeRecord.brand },
                          { col: "MANUFACTURER_NAME", val: activeRecord.canonicalManufacturer },
                          { col: "UNSPSC_CODE", val: activeRecord.unspscCode },
                          { col: "UNSPSC_COMMODITY", val: activeRecord.commodity },
                          { col: "SHORT_DESC_MOBILE", val: activeRecord.descriptions.find((d) => d.type === "MOBILE")?.text || "" },
                          { col: "SHORT_DESC_INVOICE", val: activeRecord.descriptions.find((d) => d.type === "INVOICE")?.text || "" },
                          { col: "SHORT_DESC_STANDARD", val: activeRecord.descriptions.find((d) => d.type === "SHORT")?.text || "" },
                          { col: "LONG_DESC", val: activeRecord.descriptions.find((d) => d.type === "LONG")?.text || "" },
                          ...activeRecord.attributes.map((a) => ({
                            col: `ATTR_${a.name.replace(/\s+/g, "_")}`,
                            val: a.normalizedValue,
                          })),
                        ].map((item, idx) => (
                          <div
                            key={item.col}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "240px 1fr",
                              borderTop: idx > 0 ? "1px solid var(--border-dim)" : "none",
                            }}
                          >
                            <div className="text-mono-label" style={{ padding: "8px 14px", fontSize: 10, borderRight: "1px solid var(--border-dim)", color: "var(--mono-meta)" }}>
                              {item.col}
                            </div>
                            <div className="text-mono-data" style={{ padding: "8px 14px", fontSize: 11, color: "var(--fg-primary)" }}>
                              {item.val}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
