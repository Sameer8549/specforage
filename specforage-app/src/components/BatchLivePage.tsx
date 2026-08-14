"use client";
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import Link from "next/link";
import { PRELOADED_BATCH_DATA, BatchRowItem } from "@/data/batchData";
import {
  Table,
  CheckCircle,
  Warning,
  Prohibit,
  Play,
  Pause,
  ArrowClockwise,
  DownloadSimple,
  Copy,
  Check,
  ArrowRight,
  Sliders,
  FileCsv,
  TreeStructure,
} from "@phosphor-icons/react";

function getRowStatusBadge(status: BatchRowItem["status"]) {
  if (status === "VERIFIED") return { color: "var(--status-ok)", label: "VERIFIED" };
  if (status === "FLAGGED_REVIEW") return { color: "var(--status-warn)", label: "REVIEW" };
  if (status === "PROCESSING") return { color: "var(--accent)", label: "PROCESSING" };
  if (status === "ERROR") return { color: "var(--accent)", label: "ERROR" };
  return { color: "var(--fg-dim)", label: "QUEUED" };
}

export default function BatchLivePage() {
  const [rows, setRows] = useState<BatchRowItem[]>(PRELOADED_BATCH_DATA);
  const [selectedRowId, setSelectedRowId] = useState<string>(PRELOADED_BATCH_DATA[0].id);
  const [isRunning, setIsRunning] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [copiedExport, setCopiedExport] = useState(false);

  const reduce = useReducedMotion();
  const ease = [0.16, 1, 0.3, 1] as const;

  const selectedRow = rows.find((r) => r.id === selectedRowId) || rows[0];

  const filteredRows = useMemo(() => {
    if (filterStatus === "ALL") return rows;
    return rows.filter((r) => r.status === filterStatus);
  }, [rows, filterStatus]);

  const verifiedCount = rows.filter((r) => r.status === "VERIFIED").length;
  const flaggedCount = rows.filter((r) => r.status === "FLAGGED_REVIEW").length;
  const avgConfidence = (
    rows.reduce((acc, r) => acc + r.confidence, 0) / rows.length
  ).toFixed(2);

  // Simulated batch step runner
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setRows((prev) => {
        const queuedIdx = prev.findIndex((r) => r.status === "QUEUED" || r.status === "PROCESSING");
        if (queuedIdx === -1) {
          setIsRunning(false);
          return prev;
        }
        const updated = [...prev];
        const item = updated[queuedIdx];
        if (item.currentStage < 10) {
          updated[queuedIdx] = {
            ...item,
            status: "PROCESSING",
            currentStage: item.currentStage + 1,
          };
        } else {
          updated[queuedIdx] = {
            ...item,
            status: item.mpn.includes("UNKNWN") ? "FLAGGED_REVIEW" : "VERIFIED",
            confidence: item.mpn.includes("UNKNWN") ? 0.42 : 0.98,
          };
        }
        return updated;
      });
    }, 400);
    return () => clearInterval(interval);
  }, [isRunning]);

  function resetBatch() {
    setIsRunning(false);
    setRows(
      PRELOADED_BATCH_DATA.map((r, i) =>
        i < 4
          ? r
          : {
              ...r,
              status: "QUEUED",
              currentStage: 1,
            }
      )
    );
  }

  // Generate CSV Delivery Format
  function generateCsvContent() {
    const headers = [
      "ITEM_ID",
      "ROW_NUMBER",
      "MFR_PART_NUMBER",
      "RAW_DESCRIPTION",
      "RESOLVED_BRAND",
      "RESOLVED_MANUFACTURER",
      "UNSPSC_CODE",
      "COMMODITY_TITLE",
      "CONFIDENCE_SCORE",
      "STATUS",
      "FLAG_REASON",
    ];

    const csvLines = [headers.join(",")];
    rows.forEach((r) => {
      const line = [
        `"${r.id}"`,
        r.rowNumber,
        `"${r.mpn}"`,
        `"${r.rawDescription.replace(/"/g, '""')}"`,
        `"${r.resolvedBrand || ""}"`,
        `"${r.resolvedManufacturer || ""}"`,
        `"${r.unspscCode || ""}"`,
        `"${r.commodityTitle || ""}"`,
        r.confidence,
        `"${r.status}"`,
        `"${r.flagReason || ""}"`,
      ];
      csvLines.push(line.join(","));
    });

    return csvLines.join("\n");
  }

  function downloadCsv() {
    const csvContent = generateCsvContent();
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `specforge_delivery_format_batch_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function copyCsv() {
    navigator.clipboard.writeText(generateCsvContent());
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2000);
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
                style={{ color: "var(--accent)", marginBottom: 8, fontSize: 12, fontWeight: 600 }}
              >
                Batch Ingestion & Delivery Export
              </div>
              <h1
                className="text-display"
                style={{ fontSize: "clamp(2rem, 3.5vw, 3.2rem)" }}
              >
                BATCH TELEMETRY.
              </h1>
            </div>

            {/* Batch Metrics */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, auto)",
                gap: 20,
                borderLeft: "1px solid var(--border)",
                paddingLeft: 24,
              }}
            >
              <div>
                <div className="text-mono-label" style={{ fontSize: 12, color: "var(--fg-dim)" }}>
                  BATCH SIZE
                </div>
                <div className="text-mono-data" style={{ fontSize: 18, color: "var(--fg-primary)", marginTop: 4 }}>
                  {rows.length} ROWS
                </div>
              </div>
              <div>
                <div className="text-mono-label" style={{ fontSize: 12, color: "var(--status-ok)" }}>
                  VERIFIED
                </div>
                <div className="text-mono-data" style={{ fontSize: 18, color: "var(--status-ok)", marginTop: 4 }}>
                  {verifiedCount} ({Math.round((verifiedCount / rows.length) * 100)}%)
                </div>
              </div>
              <div>
                <div className="text-mono-label" style={{ fontSize: 12, color: "var(--status-warn)" }}>
                  REVIEW QUEUE
                </div>
                <div className="text-mono-data" style={{ fontSize: 18, color: "var(--status-warn)", marginTop: 4 }}>
                  {flaggedCount} FLAGGED
                </div>
              </div>
              <div>
                <div className="text-mono-label" style={{ fontSize: 12, color: "var(--fg-dim)" }}>
                  THROUGHPUT
                </div>
                <div className="text-mono-data" style={{ fontSize: 18, color: "var(--fg-primary)", marginTop: 4 }}>
                  2.8 ROWS/S
                </div>
              </div>
            </div>
          </div>

          {/* ── Batch Control & Filter Bar ── */}
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
            {/* Action Buttons */}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                onClick={() => setIsRunning(!isRunning)}
                className="btn-primary"
                style={{ padding: "8px 16px", fontSize: 11 }}
              >
                {isRunning ? <Pause size={14} weight="bold" /> : <Play size={14} weight="bold" />}
                {isRunning ? "PAUSE PIPELINE" : "RUN BATCH PIPELINE"}
              </button>

              <button
                onClick={resetBatch}
                className="btn-ghost"
                style={{ padding: "8px 14px", fontSize: 11 }}
              >
                <ArrowClockwise size={13} />
                RESET QUEUE
              </button>
            </div>

            {/* Filter & Export */}
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <span className="text-mono-label" style={{ fontSize: 11.5 }}>FILTER STATUS:</span>
              {["ALL", "VERIFIED", "FLAGGED_REVIEW"].map((st) => {
                const active = filterStatus === st;
                return (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
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
                    {st === "FLAGGED_REVIEW" ? "REVIEW QUEUE" : st}
                  </button>
                );
              })}

              <div style={{ borderLeft: "1px solid var(--border)", paddingLeft: 12, display: "flex", gap: 8 }}>
                <button
                  onClick={copyCsv}
                  className="btn-ghost"
                  style={{ padding: "6px 12px", fontSize: 12 }}
                >
                  {copiedExport ? <Check size={13} style={{ color: "var(--status-ok)" }} /> : <Copy size={13} />}
                  {copiedExport ? "COPIED CSV" : "COPY CSV"}
                </button>
                <button
                  onClick={downloadCsv}
                  className="btn-primary"
                  style={{ padding: "6px 14px", fontSize: 12 }}
                >
                  <DownloadSimple size={13} weight="bold" />
                  EXPORT DELIVERY CSV
                </button>
              </div>
            </div>
          </div>

          {/* ── Main Workspace: Table + Row Inspector ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 380px",
              flex: 1,
            }}
          >
            {/* ── LEFT: Batch Rows Table ── */}
            <div style={{ borderRight: "1px solid var(--border)", overflowX: "auto" }}>
              <div style={{ minWidth: 760 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "45px 140px 1fr 140px 110px 80px 110px",
                    backgroundColor: "var(--bg-elevated)",
                    borderBottom: "1px solid var(--border-dim)",
                  }}
                >
                  {["#", "MPN", "RAW DESCRIPTION", "RESOLVED ENTITY", "UNSPSC", "STAGE", "STATUS"].map((h, i) => (
                    <div
                      key={h}
                      className="text-mono-label"
                      style={{ padding: "10px 12px", fontSize: 11.5, color: "var(--fg-dim)", borderRight: i < 6 ? "1px solid var(--border-dim)" : "none" }}
                    >
                      {h}
                    </div>
                  ))}
                </div>

              {filteredRows.map((r) => {
                const isSel = r.id === selectedRow.id;
                const badge = getRowStatusBadge(r.status);

                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRowId(r.id)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "45px 140px 1fr 140px 110px 80px 110px",
                      borderTop: "1px solid var(--border-dim)",
                      backgroundColor: isSel ? "var(--bg-surface)" : "transparent",
                      borderLeft: `3px solid ${isSel ? "var(--accent)" : "transparent"}`,
                      cursor: "pointer",
                      transition: "background 100ms ease",
                    }}
                  >
                    {/* Row Num */}
                    <div className="text-mono-label" style={{ padding: "12px", fontSize: 12, color: "var(--mono-meta)", borderRight: "1px solid var(--border-dim)" }}>
                      {r.rowNumber}
                    </div>

                    {/* MPN */}
                    <div className="text-mono-data" style={{ padding: "12px", fontSize: 11.5, color: isSel ? "var(--accent)" : "var(--fg-primary)", fontWeight: 500, borderRight: "1px solid var(--border-dim)" }}>
                      {r.mpn}
                    </div>

                    {/* Description */}
                    <div className="text-mono-data" style={{ padding: "12px", fontSize: 11, color: "var(--fg-secondary)", borderRight: "1px solid var(--border-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.rawDescription}
                    </div>

                    {/* Resolved Brand / Mfr */}
                    <div className="text-mono-label" style={{ padding: "12px", fontSize: 12, color: "var(--fg-primary)", borderRight: "1px solid var(--border-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.resolvedBrand || "—"}
                    </div>

                    {/* UNSPSC */}
                    <div className="text-mono-data" style={{ padding: "12px", fontSize: 11, color: "var(--status-ok)", borderRight: "1px solid var(--border-dim)" }}>
                      {r.unspscCode || "—"}
                    </div>

                    {/* Current Stage */}
                    <div className="text-mono-data" style={{ padding: "12px", fontSize: 11, color: r.currentStage === 10 ? "var(--status-ok)" : "var(--accent)", borderRight: "1px solid var(--border-dim)" }}>
                      {r.currentStage}/10
                    </div>

                    {/* Status */}
                    <div style={{ padding: "12px", display: "flex", alignItems: "center" }}>
                      <span
                        className="badge"
                        style={{
                          color: badge.color,
                          borderColor: badge.color,
                          fontSize: 11,
                        }}
                      >
                        {badge.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

            {/* ── RIGHT: Selected Row Deep Inspector ── */}
            <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18, backgroundColor: "var(--bg-surface)", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span className="badge badge-dim" style={{ marginBottom: 4 }}>
                    ROW #{selectedRow.rowNumber} · {selectedRow.id}
                  </span>
                  <h3 className="text-display" style={{ fontSize: "1.6rem" }}>
                    {selectedRow.mpn}
                  </h3>
                </div>

                <span
                  className="badge"
                  style={{
                    color: getRowStatusBadge(selectedRow.status).color,
                    borderColor: getRowStatusBadge(selectedRow.status).color,
                    fontSize: 11.5,
                  }}
                >
                  {getRowStatusBadge(selectedRow.status).label}
                </span>
              </div>

              {/* Raw Input Telemetry */}
              <div style={{ border: "1px solid var(--border)", padding: "14px", backgroundColor: "var(--bg-root)" }}>
                <div className="text-mono-label" style={{ fontSize: 11.5, color: "var(--accent)", marginBottom: 8, fontWeight: 600 }}>
                  Raw Distributor Catalog Ingestion
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div className="text-mono-label" style={{ fontSize: 12 }}>
                    RAW DESC: <span style={{ color: "var(--fg-primary)" }}>{selectedRow.rawDescription}</span>
                  </div>
                  <div className="text-mono-label" style={{ fontSize: 12 }}>
                    RAW BRAND: <span style={{ color: selectedRow.rawBrand.startsWith("--") ? "var(--status-warn)" : "var(--fg-primary)" }}>{selectedRow.rawBrand}</span>
                  </div>
                  <div className="text-mono-label" style={{ fontSize: 12 }}>
                    RAW MFR: <span style={{ color: "var(--fg-primary)" }}>{selectedRow.rawManufacturer}</span>
                  </div>
                </div>
              </div>

              {/* Resolved Output Telemetry */}
              <div style={{ border: "1px solid var(--border)", padding: "14px", backgroundColor: "var(--bg-root)" }}>
                <div className="text-mono-label" style={{ fontSize: 11.5, color: "var(--status-ok)", marginBottom: 8 }}>
                  [ STRUCTURED DELIVERY OUTPUT ]
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div className="text-mono-label" style={{ fontSize: 12 }}>
                    UNSPSC: <span style={{ color: "var(--accent)" }}>{selectedRow.unspscCode || "CLASSIFYING..."}</span>
                  </div>
                  <div className="text-mono-label" style={{ fontSize: 12 }}>
                    COMMODITY: <span style={{ color: "var(--fg-primary)" }}>{selectedRow.commodityTitle || "—"}</span>
                  </div>
                  <div className="text-mono-label" style={{ fontSize: 12 }}>
                    CANONICAL MFR: <span style={{ color: "var(--fg-primary)" }}>{selectedRow.resolvedManufacturer || "—"}</span>
                  </div>
                  <div className="text-mono-label" style={{ fontSize: 12 }}>
                    CONFIDENCE: <span style={{ color: "var(--status-ok)" }}>{(selectedRow.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>

                {selectedRow.flagReason && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border-dim)", color: "var(--status-warn)" }} className="text-mono-label">
                    ⚠ REVIEW NOTE: {selectedRow.flagReason}
                  </div>
                )}
              </div>

              {/* Stage Progress Tracker */}
              <div style={{ border: "1px solid var(--border)", padding: "14px", backgroundColor: "var(--bg-root)" }}>
                <div className="text-mono-label" style={{ fontSize: 11.5, color: "var(--fg-dim)", marginBottom: 8 }}>
                  [ 10-STAGE PIPELINE PROGRESSION ]
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4 }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((st) => {
                    const done = selectedRow.currentStage >= st;
                    return (
                      <div
                        key={st}
                        style={{
                          padding: "6px",
                          textAlign: "center",
                          backgroundColor: done ? "rgba(74,246,38,0.08)" : "var(--bg-elevated)",
                          border: `1px solid ${done ? "var(--status-ok)" : "var(--border-dim)"}`,
                        }}
                      >
                        <span className="text-mono-label" style={{ fontSize: 11.5, color: done ? "var(--status-ok)" : "var(--fg-dim)" }}>
                          S{st}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Link
                href="/records"
                className="btn-primary"
                style={{ width: "100%", justifyContent: "center", marginTop: "auto" }}
              >
                OPEN IN RECORD INSPECTOR
                <ArrowRight size={14} weight="bold" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
