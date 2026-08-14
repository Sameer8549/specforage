"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import Link from "next/link";
import {
  VERIFIED_MANUFACTURERS,
  BLACKLISTED_DOMAINS,
  SAMPLE_PROVENANCE_TRACES,
  ManufacturerDomain,
  ProvenanceTraceItem,
} from "@/data/provenanceData";
import {
  ShieldCheck,
  ShieldWarning,
  Prohibit,
  Globe,
  MagnifyingGlass,
  ArrowRight,
  CheckCircle,
  FileText,
  Lock,
  ArrowSquareOut,
  Sliders,
  Sparkle,
} from "@phosphor-icons/react";

export default function ProvenancePage() {
  const [activeTab, setActiveTab] = useState<"REGISTRY" | "BLACKLIST" | "TRACES" | "SIMULATOR">("TRACES");
  const [selectedTrace, setSelectedTrace] = useState<ProvenanceTraceItem>(SAMPLE_PROVENANCE_TRACES[0]);
  const [searchMfr, setSearchMfr] = useState("");

  // Simulator state
  const [simMfr, setSimMfr] = useState("Square D");
  const [simMpn, setSimMpn] = useState("QO120");
  const [simKeyword, setSimKeyword] = useState("interrupt rating 10kA");
  const [simOutput, setSimOutput] = useState<{
    resolvedMfr: string;
    targetDomain: string;
    query: string;
    interceptedBlockedDomains: string[];
    allowedTargetUrls: string[];
  } | null>(null);

  const reduce = useReducedMotion();
  const ease = [0.16, 1, 0.3, 1] as const;

  const filteredMfrs = useMemo(() => {
    if (!searchMfr.trim()) return VERIFIED_MANUFACTURERS;
    const q = searchMfr.toLowerCase();
    return VERIFIED_MANUFACTURERS.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.primaryDomain.toLowerCase().includes(q) ||
        m.aliases.some((a) => a.toLowerCase().includes(q))
    );
  }, [searchMfr]);

  function runSimulator(mfr: string, mpn: string, kw: string) {
    let resolved = "Schneider Electric USA (Square D)";
    let domain = "se.com";

    const m = mfr.toLowerCase();
    if (m.includes("frigid")) {
      resolved = "Frigidaire Company (Electrolux)";
      domain = "frigidaire.com";
    } else if (m.includes("swagelok")) {
      resolved = "Swagelok Company";
      domain = "swagelok.com";
    } else if (m.includes("apollo") || m.includes("conbraco")) {
      resolved = "Conbraco Industries (Apollo Valves)";
      domain = "apollovalves.com";
    } else if (m.includes("goulds") || m.includes("xylem")) {
      resolved = "Goulds Water Technology (Xylem)";
      domain = "goulds.com";
    }

    const cleanMpn = mpn.trim();
    const cleanKw = kw.trim();
    const query = `site:${domain} "${cleanMpn}" ${cleanKw ? `"${cleanKw}"` : ""}`.trim();

    setSimOutput({
      resolvedMfr: resolved,
      targetDomain: domain,
      query,
      interceptedBlockedDomains: [
        `amazon.com/dp/${cleanMpn || "B00002N5GX"} [BLOCKED: Marketplace Listing]`,
        `grainger.com/product/${cleanMpn || "4A891"} [BLOCKED: Secondary Distributor]`,
        `ebay.com/itm/${cleanMpn || "19283746"} [BLOCKED: Unverified Seller]`,
      ],
      allowedTargetUrls: [
        `https://www.${domain}/products/${cleanMpn ? cleanMpn.toLowerCase() : "item"}`,
        `https://download.${domain}/catalogs/specs.pdf`,
      ],
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
                style={{ color: "var(--accent)", marginBottom: 8 }}
              >
                [ GOVERNANCE / SOURCE DISCIPLINE & PROVENANCE ]
              </div>
              <h1
                className="text-display"
                style={{ fontSize: "clamp(2rem, 3.5vw, 3.2rem)" }}
              >
                ZERO HALLUCINATION.
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
                  MFR RESTRICTION
                </div>
                <div className="text-mono-data" style={{ fontSize: 18, color: "var(--status-ok)", marginTop: 4 }}>
                  100% STRICT
                </div>
              </div>
              <div>
                <div className="text-mono-label" style={{ fontSize: 10, color: "var(--fg-dim)" }}>
                  BLOCKED SOURCES
                </div>
                <div className="text-mono-data" style={{ fontSize: 18, color: "var(--accent)", marginTop: 4 }}>
                  28,562 DROPPED
                </div>
              </div>
              <div>
                <div className="text-mono-label" style={{ fontSize: 10, color: "var(--fg-dim)" }}>
                  FACTUAL ENTAILMENT
                </div>
                <div className="text-mono-data" style={{ fontSize: 18, color: "var(--status-ok)", marginTop: 4 }}>
                  98.6% VERIFIED
                </div>
              </div>
            </div>
          </div>

          {/* ── Navigation Tabs ── */}
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
                { key: "TRACES", label: "PROVENANCE LINEAGE TRACES" },
                { key: "SIMULATOR", label: "LIVE DOMAIN GUARD SIMULATOR" },
                { key: "REGISTRY", label: "VERIFIED MFR REGISTRY" },
                { key: "BLACKLIST", label: "MARKETPLACE BLACKLIST" },
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

          {/* ── Tab Contents ── */}
          <div style={{ padding: "36px 48px", flex: 1 }}>
            <AnimatePresence mode="wait">
              {/* TAB 1: PROVENANCE LINEAGE TRACES */}
              {activeTab === "TRACES" && (
                <motion.div
                  key="TRACES"
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease }}
                  style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 24 }}
                >
                  {/* Left List of Traces */}
                  <div style={{ border: "1px solid var(--border)" }}>
                    <div
                      style={{
                        padding: "10px 16px",
                        backgroundColor: "var(--bg-elevated)",
                        borderBottom: "1px solid var(--border-dim)",
                      }}
                    >
                      <span className="text-mono-label" style={{ color: "var(--accent)", fontSize: 10 }}>
                        [ AUDITED EXTRACTION TRACES ]
                      </span>
                    </div>

                    {SAMPLE_PROVENANCE_TRACES.map((trc) => {
                      const isSel = selectedTrace.id === trc.id;
                      return (
                        <button
                          key={trc.id}
                          onClick={() => setSelectedTrace(trc)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "14px 18px",
                            border: "none",
                            borderTop: "1px solid var(--border-dim)",
                            background: isSel ? "var(--bg-surface)" : "transparent",
                            borderLeft: `3px solid ${isSel ? "var(--accent)" : "transparent"}`,
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span className="text-mono-data" style={{ color: isSel ? "var(--accent)" : "var(--fg-primary)", fontSize: 12 }}>
                              {trc.mpn}
                            </span>
                            <span className="badge" style={{ color: "var(--status-ok)", borderColor: "var(--status-ok)", fontSize: 8.5 }}>
                              {trc.entailmentVerdict}
                            </span>
                          </div>

                          <div className="text-mono-label" style={{ fontSize: 10, color: "var(--fg-secondary)" }}>
                            FIELD: <span style={{ color: "var(--fg-primary)" }}>{trc.field}</span>
                          </div>

                          <div className="text-mono-label" style={{ fontSize: 9, color: "var(--mono-meta)" }}>
                            DOMAIN: {trc.domain}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Right Detail Card for Trace */}
                  <div style={{ border: "1px solid var(--border)", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div className="badge badge-dim" style={{ marginBottom: 6 }}>
                          TRACE ID: {selectedTrace.id}
                        </div>
                        <h3 className="text-display" style={{ fontSize: "1.6rem" }}>
                          {selectedTrace.field}: {selectedTrace.extractedValue}
                        </h3>
                      </div>
                      <span className="badge" style={{ color: "var(--status-ok)", borderColor: "var(--status-ok)", fontSize: 10 }}>
                        ✓ ENTAILED ({(selectedTrace.entailmentScore * 100).toFixed(0)}% MATCH)
                      </span>
                    </div>

                    {/* Technical Telemetry Grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, borderTop: "1px solid var(--border-dim)", paddingTop: 16 }}>
                      <div>
                        <div className="text-mono-label" style={{ fontSize: 9.5, color: "var(--fg-dim)", marginBottom: 4 }}>
                          RESTRICTED QUERY EXECUTED
                        </div>
                        <code style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)" }}>
                          {selectedTrace.queryExecuted}
                        </code>
                      </div>

                      <div>
                        <div className="text-mono-label" style={{ fontSize: 9.5, color: "var(--fg-dim)", marginBottom: 4 }}>
                          HTTP RESPONSE STATUS
                        </div>
                        <div className="text-mono-data" style={{ fontSize: 12, color: "var(--status-ok)" }}>
                          {selectedTrace.httpStatus} OK (Direct TLS Encrypted Response)
                        </div>
                      </div>
                    </div>

                    {/* Source URL */}
                    <div style={{ borderTop: "1px solid var(--border-dim)", paddingTop: 16 }}>
                      <div className="text-mono-label" style={{ fontSize: 9.5, color: "var(--fg-dim)", marginBottom: 4 }}>
                        VERIFIED MANUFACTURER SOURCE URL
                      </div>
                      <a
                        href={selectedTrace.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--fg-primary)",
                          textDecoration: "underline",
                          wordBreak: "break-all",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        {selectedTrace.url}
                        <ArrowSquareOut size={12} />
                      </a>
                    </div>

                    {/* Raw Snippet Match */}
                    <div
                      style={{
                        padding: "16px",
                        backgroundColor: "var(--bg-elevated)",
                        border: "1px solid var(--border-dim)",
                      }}
                    >
                      <div className="text-mono-label" style={{ fontSize: 9.5, color: "var(--status-ok)", marginBottom: 6 }}>
                        [ FACTUAL ENTAILMENT EVIDENCE SNIPPET ]
                      </div>
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-primary)", lineHeight: 1.5 }}>
                        {selectedTrace.snippetMatch}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: LIVE DOMAIN GUARD SIMULATOR */}
              {activeTab === "SIMULATOR" && (
                <motion.div
                  key="SIMULATOR"
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease }}
                  style={{ display: "flex", flexDirection: "column", gap: 24 }}
                >
                  <div
                    style={{
                      padding: "24px",
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--bg-surface)",
                    }}
                  >
                    <div className="text-mono-label" style={{ color: "var(--accent)", marginBottom: 12 }}>
                      [ TEST MANUFACTURER DOMAIN DISCIPLINE & INTERCEPTION ENGINE ]
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 16, alignItems: "end" }}>
                      <div>
                        <label className="text-mono-label" style={{ fontSize: 10, display: "block", marginBottom: 4 }}>
                          MANUFACTURER INPUT
                        </label>
                        <input
                          type="text"
                          value={simMfr}
                          onChange={(e) => setSimMfr(e.target.value)}
                          className="input-underline"
                          style={{ padding: "8px", border: "1px solid var(--border)" }}
                        />
                      </div>

                      <div>
                        <label className="text-mono-label" style={{ fontSize: 10, display: "block", marginBottom: 4 }}>
                          MPN (PART NUMBER)
                        </label>
                        <input
                          type="text"
                          value={simMpn}
                          onChange={(e) => setSimMpn(e.target.value)}
                          className="input-underline"
                          style={{ padding: "8px", border: "1px solid var(--border)" }}
                        />
                      </div>

                      <div>
                        <label className="text-mono-label" style={{ fontSize: 10, display: "block", marginBottom: 4 }}>
                          TARGET SPEC PROPERTY
                        </label>
                        <input
                          type="text"
                          value={simKeyword}
                          onChange={(e) => setSimKeyword(e.target.value)}
                          className="input-underline"
                          style={{ padding: "8px", border: "1px solid var(--border)" }}
                        />
                      </div>

                      <button
                        onClick={() => runSimulator(simMfr, simMpn, simKeyword)}
                        className="btn-primary"
                        style={{ height: 38 }}
                      >
                        RUN GUARD
                      </button>
                    </div>
                  </div>

                  {simOutput && (
                    <div style={{ border: "1px solid var(--border)", padding: "24px" }}>
                      <div className="text-mono-label" style={{ color: "var(--status-ok)", marginBottom: 16 }}>
                        [ DOMAIN GUARD TELEMETRY REPORT ]
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                        {/* Allowed Query */}
                        <div style={{ border: "1px solid var(--border)", padding: "16px", backgroundColor: "var(--bg-root)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            <ShieldCheck size={16} style={{ color: "var(--status-ok)" }} />
                            <span className="text-mono-label" style={{ color: "var(--status-ok)", fontSize: 10 }}>
                              AUTHORIZED QUERY (RESTRICTED TO {simOutput.targetDomain})
                            </span>
                          </div>
                          <code style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-primary)", display: "block", marginBottom: 12 }}>
                            {simOutput.query}
                          </code>
                          <div className="text-mono-label" style={{ fontSize: 9.5, color: "var(--fg-secondary)" }}>
                            RESOLVED CANONICAL ENTITY: {simOutput.resolvedMfr}
                          </div>
                        </div>

                        {/* Blocked Candidates */}
                        <div style={{ border: "1px solid var(--accent)", padding: "16px", backgroundColor: "rgba(230,25,25,0.04)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            <Prohibit size={16} style={{ color: "var(--accent)" }} />
                            <span className="text-mono-label" style={{ color: "var(--accent)", fontSize: 10 }}>
                              INTERCEPTED & DROPPED SOURCES ({simOutput.interceptedBlockedDomains.length})
                            </span>
                          </div>
                          {simOutput.interceptedBlockedDomains.map((b) => (
                            <div key={b} className="text-mono-label" style={{ fontSize: 10, color: "var(--accent)", marginTop: 4 }}>
                              ✕ {b}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 3: VERIFIED MFR REGISTRY */}
              {activeTab === "REGISTRY" && (
                <motion.div
                  key="REGISTRY"
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease }}
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <input
                      type="text"
                      placeholder="FILTER MANUFACTURERS OR DOMAINS..."
                      value={searchMfr}
                      onChange={(e) => setSearchMfr(e.target.value)}
                      style={{
                        padding: "8px 14px",
                        border: "1px solid var(--border)",
                        background: "var(--bg-surface)",
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--fg-primary)",
                        width: 320,
                      }}
                    />
                    <span className="text-mono-label" style={{ fontSize: 10 }}>
                      {filteredMfrs.length} VERIFIED AUTHORITIES
                    </span>
                  </div>

                  <div style={{ border: "1px solid var(--border)" }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "200px 180px 1fr 140px 120px",
                        backgroundColor: "var(--bg-elevated)",
                        borderBottom: "1px solid var(--border-dim)",
                      }}
                    >
                      {["MANUFACTURER", "PRIMARY DOMAIN", "KNOWN ALIASES / RESOLUTION MAP", "STATUS", "QUERIES"].map((h, i) => (
                        <div
                          key={h}
                          className="text-mono-label"
                          style={{ padding: "9px 12px", fontSize: 9.5, color: "var(--fg-dim)", borderRight: i < 4 ? "1px solid var(--border-dim)" : "none" }}
                        >
                          {h}
                        </div>
                      ))}
                    </div>

                    {filteredMfrs.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "200px 180px 1fr 140px 120px",
                          borderTop: "1px solid var(--border-dim)",
                        }}
                      >
                        <div className="text-mono-data" style={{ padding: "12px", fontSize: 12, borderRight: "1px solid var(--border-dim)" }}>
                          {m.name}
                          {m.parentCompany && (
                            <div className="text-mono-label" style={{ fontSize: 9, color: "var(--mono-meta)", marginTop: 2 }}>
                              Parent: {m.parentCompany}
                            </div>
                          )}
                        </div>

                        <div className="text-mono-data" style={{ padding: "12px", fontSize: 11, color: "var(--status-ok)", borderRight: "1px solid var(--border-dim)" }}>
                          {m.primaryDomain}
                        </div>

                        <div style={{ padding: "12px", borderRight: "1px solid var(--border-dim)" }}>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {m.aliases.map((a) => (
                              <span key={a} className="badge badge-dim" style={{ fontSize: 8.5 }}>
                                {a}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div style={{ padding: "12px", borderRight: "1px solid var(--border-dim)", display: "flex", alignItems: "center" }}>
                          <span className="badge" style={{ color: "var(--status-ok)", borderColor: "var(--status-ok)", fontSize: 8.5 }}>
                            {m.status}
                          </span>
                        </div>

                        <div className="text-mono-data" style={{ padding: "12px", fontSize: 11, color: "var(--fg-secondary)" }}>
                          {m.queriesRun.toLocaleString()} runs
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* TAB 4: MARKETPLACE BLACKLIST */}
              {activeTab === "BLACKLIST" && (
                <motion.div
                  key="BLACKLIST"
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
                        [ HARD-ENFORCED DISTRIBUTOR & MARKETPLACE BLOCKLIST ]
                      </span>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "180px 140px 1fr 140px",
                        backgroundColor: "var(--bg-surface)",
                        borderBottom: "1px solid var(--border-dim)",
                      }}
                    >
                      {["DOMAIN", "CATEGORY", "STRICT REJECTION REASON", "BLOCKED QUERIES"].map((h, i) => (
                        <div key={h} className="text-mono-label" style={{ padding: "9px 12px", fontSize: 9.5, color: "var(--fg-dim)", borderRight: i < 3 ? "1px solid var(--border-dim)" : "none" }}>
                          {h}
                        </div>
                      ))}
                    </div>

                    {BLACKLISTED_DOMAINS.map((b) => (
                      <div
                        key={b.domain}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "180px 140px 1fr 140px",
                          borderTop: "1px solid var(--border-dim)",
                        }}
                      >
                        <div className="text-mono-data" style={{ padding: "12px", fontSize: 12, color: "var(--accent)", borderRight: "1px solid var(--border-dim)" }}>
                          {b.domain}
                        </div>
                        <div style={{ padding: "12px", borderRight: "1px solid var(--border-dim)" }}>
                          <span className="badge badge-dim" style={{ fontSize: 8.5 }}>
                            {b.category}
                          </span>
                        </div>
                        <div className="text-mono-label" style={{ padding: "12px", fontSize: 10, color: "var(--fg-secondary)", borderRight: "1px solid var(--border-dim)" }}>
                          {b.reason}
                        </div>
                        <div className="text-mono-data" style={{ padding: "12px", fontSize: 11, color: "var(--accent)" }}>
                          {b.blockedQueriesCount.toLocaleString()} blocked
                        </div>
                      </div>
                    ))}
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
