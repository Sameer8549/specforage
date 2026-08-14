"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import Link from "next/link";
import {
  VOCABULARY_REGISTRY,
  VocabTerm,
  VocabState,
} from "@/data/vocabularyData";
import {
  BookBookmark,
  CheckCircle,
  Warning,
  Prohibit,
  MagnifyingGlass,
  ArrowRight,
  Sparkle,
  Check,
  Plus,
  ArrowSquareOut,
  Tag,
  ShieldCheck,
} from "@phosphor-icons/react";

function getStateBadge(status: VocabState) {
  if (status === "MATCHED") {
    return { color: "var(--status-ok)", label: "MATCHED" };
  }
  if (status === "FIRST SEEN") {
    return { color: "var(--status-warn)", label: "FIRST SEEN" };
  }
  return { color: "var(--accent)", label: "FLAGGED" };
}

export default function VocabularyPage() {
  const [terms, setTerms] = useState<VocabTerm[]>(VOCABULARY_REGISTRY);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedState, setSelectedState] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sandboxInput, setSandboxInput] = useState("316 ss");
  const [sandboxResult, setSandboxResult] = useState<{
    canonical: string;
    state: VocabState;
    category: string;
    rule: string;
    synonymMatched: string;
  } | null>(null);

  const reduce = useReducedMotion();
  const ease = [0.16, 1, 0.3, 1] as const;

  // Filtered terms
  const filteredTerms = useMemo(() => {
    return terms.filter((term) => {
      const matchCat = selectedCategory === "ALL" || term.category === selectedCategory;
      const matchState = selectedState === "ALL" || term.status === selectedState;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !searchQuery.trim() ||
        term.canonicalTerm.toLowerCase().includes(q) ||
        term.synonyms.some((s) => s.toLowerCase().includes(q)) ||
        term.category.toLowerCase().includes(q);

      return matchCat && matchState && matchSearch;
    });
  }, [terms, selectedCategory, selectedState, searchQuery]);

  // Approve a FIRST SEEN term into MATCHED
  function approveTerm(id: string) {
    setTerms((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: "MATCHED" as VocabState, governanceNote: undefined } : t
      )
    );
  }

  // Live Normalizer Sandbox simulation
  function resolveSandbox(input: string) {
    const raw = input.trim();
    if (!raw) return;

    const lower = raw.toLowerCase();
    let foundTerm: VocabTerm | null = null;
    let matchedSyn = "";

    for (const t of terms) {
      if (t.canonicalTerm.toLowerCase() === lower) {
        foundTerm = t;
        matchedSyn = t.canonicalTerm;
        break;
      }
      for (const s of t.synonyms) {
        if (s.toLowerCase() === lower || lower.includes(s.toLowerCase())) {
          foundTerm = t;
          matchedSyn = s;
          break;
        }
      }
      if (foundTerm) break;
    }

    if (foundTerm) {
      setSandboxResult({
        canonical: foundTerm.canonicalTerm,
        state: foundTerm.status,
        category: foundTerm.category,
        rule: `Fuzzy & synonym registry mapping matched via '${matchedSyn}'`,
        synonymMatched: matchedSyn,
      });
    } else {
      // Novel term
      setSandboxResult({
        canonical: raw.replace(/\b\w/g, (c) => c.toUpperCase()),
        state: "FIRST SEEN",
        category: "DISCOVERED_CANDIDATE",
        rule: "Novel unmapped value detected — assigned FIRST SEEN state",
        synonymMatched: "(No prior synonym match)",
      });
    }
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
                Controlled Vocabulary Authority
              </div>
              <h1
                className="text-display"
                style={{ fontSize: "clamp(2rem, 3.5vw, 3.2rem)" }}
              >
                VOCABULARY AUTHORITY.
              </h1>
            </div>

            {/* Tri-State Telemetry Metrics */}
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
                  CANONICAL TERMS
                </div>
                <div className="text-mono-data" style={{ fontSize: 18, color: "var(--fg-primary)", marginTop: 4 }}>
                  1,480 REGISTERED
                </div>
              </div>
              <div>
                <div className="text-mono-label" style={{ fontSize: 12, color: "var(--status-ok)" }}>
                  MATCHED
                </div>
                <div className="text-mono-data" style={{ fontSize: 18, color: "var(--status-ok)", marginTop: 4 }}>
                  94.2%
                </div>
              </div>
              <div>
                <div className="text-mono-label" style={{ fontSize: 12, color: "var(--status-warn)" }}>
                  FIRST SEEN
                </div>
                <div className="text-mono-data" style={{ fontSize: 18, color: "var(--status-warn)", marginTop: 4 }}>
                  {terms.filter((t) => t.status === "FIRST SEEN").length} CANDIDATES
                </div>
              </div>
              <div>
                <div className="text-mono-label" style={{ fontSize: 12, color: "var(--accent)" }}>
                  FLAGGED
                </div>
                <div className="text-mono-data" style={{ fontSize: 18, color: "var(--accent)", marginTop: 4 }}>
                  {terms.filter((t) => t.status === "FLAGGED").length} TO REVIEW
                </div>
              </div>
            </div>
          </div>

          {/* ── Live Normalizer Sandbox ── */}
          <div
            style={{
              padding: "24px 48px",
              borderBottom: "1px solid var(--border)",
              backgroundColor: "var(--bg-surface)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkle size={15} style={{ color: "var(--accent)" }} />
                <span className="text-mono-label" style={{ color: "var(--accent)", fontSize: 11, fontWeight: 600 }}>
                  Real-Time Vocabulary Resolver Sandbox
                </span>
              </div>
              <span className="text-mono-label" style={{ fontSize: 12 }}>
                TRI-STATE ASSIGNMENT ENGINE
              </span>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 320 }}>
                <input
                  type="text"
                  className="input-underline"
                  value={sandboxInput}
                  onChange={(e) => setSandboxInput(e.target.value)}
                  placeholder="Enter raw material, finish, UOM, or connection (e.g. '316 ss', '47db', 'fnpt x fnpt')..."
                  style={{
                    backgroundColor: "var(--bg-root)",
                    padding: "10px 14px",
                    border: "1px solid var(--border)",
                    fontSize: 13,
                    fontFamily: "var(--font-mono)",
                  }}
                />
              </div>
              <button
                onClick={() => resolveSandbox(sandboxInput)}
                className="btn-primary"
                style={{ padding: "10px 20px", fontSize: 11 }}
              >
                RESOLVE VALUE
                <ArrowRight size={14} weight="bold" />
              </button>
            </div>

            {/* Quick Sample Values */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
              <span className="text-mono-label" style={{ fontSize: 11.5, color: "var(--mono-meta)" }}>
                SAMPLE TERMS:
              </span>
              {[
                "316 ss",
                "smudge-proof stainless",
                "fnpt x fnpt",
                "5100 psig",
                "47db",
                "super duplex 2507",
                "press-fit",
              ].map((sample) => (
                <button
                  key={sample}
                  onClick={() => {
                    setSandboxInput(sample);
                    resolveSandbox(sample);
                  }}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border-dim)",
                    padding: "3px 8px",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11.5,
                    color: "var(--fg-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {sample}
                </button>
              ))}
            </div>

            {/* Sandbox Resolution Card */}
            {sandboxResult && (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease }}
                style={{
                  marginTop: 16,
                  padding: "16px",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--bg-root)",
                  display: "grid",
                  gridTemplateColumns: "180px 1fr auto",
                  gap: 16,
                  alignItems: "center",
                }}
              >
                <div>
                  <div className="text-mono-label" style={{ fontSize: 12, color: "var(--fg-dim)" }}>
                    CANONICAL APPROVED FORM
                  </div>
                  <div className="text-mono-data" style={{ fontSize: 14, color: "var(--fg-primary)", marginTop: 2, fontWeight: 500 }}>
                    {sandboxResult.canonical}
                  </div>
                </div>

                <div>
                  <div className="text-mono-label" style={{ fontSize: 12, color: "var(--fg-secondary)" }}>
                    CATEGORY: <span style={{ color: "var(--fg-primary)" }}>{sandboxResult.category}</span>
                  </div>
                  <div className="text-mono-label" style={{ fontSize: 11.5, color: "var(--mono-meta)", marginTop: 4 }}>
                    {sandboxResult.rule}
                  </div>
                </div>

                <div>
                  {(() => {
                    const badge = getStateBadge(sandboxResult.state);
                    return (
                      <span
                        className="badge"
                        style={{
                          color: badge.color,
                          borderColor: badge.color,
                          fontSize: 12,
                        }}
                      >
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>
              </motion.div>
            )}
          </div>

          {/* ── Search & Filter Controls ── */}
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
                minWidth: 300,
              }}
            >
              <MagnifyingGlass size={14} style={{ color: "var(--fg-dim)" }} />
              <input
                type="text"
                placeholder="SEARCH VOCABULARY REGISTRY..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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

            {/* Category Filters */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span className="text-mono-label" style={{ fontSize: 11.5 }}>CATEGORY:</span>
              {["ALL", "MATERIALS", "FINISHES", "CONNECTIONS", "UOM"].map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
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
                    {cat}
                  </button>
                );
              })}

              <span className="text-mono-label" style={{ fontSize: 11.5, marginLeft: 8 }}>STATE:</span>
              {["ALL", "MATCHED", "FIRST SEEN", "FLAGGED"].map((st) => {
                const active = selectedState === st;
                return (
                  <button
                    key={st}
                    onClick={() => setSelectedState(st)}
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
                    {st}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Vocabulary Term Table ── */}
          <div style={{ flex: 1, padding: "36px 48px" }}>
            <div style={{ border: "1px solid var(--border)" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "220px 140px 1fr 120px 140px",
                  backgroundColor: "var(--bg-elevated)",
                  borderBottom: "1px solid var(--border-dim)",
                }}
              >
                {["CANONICAL TERM", "CATEGORY", "SYNONYM MAPPINGS", "STATUS", "GOVERNANCE ACTION"].map((h, i) => (
                  <div
                    key={h}
                    className="text-mono-label"
                    style={{ padding: "10px 14px", fontSize: 11.5, color: "var(--fg-dim)", borderRight: i < 4 ? "1px solid var(--border-dim)" : "none" }}
                  >
                    {h}
                  </div>
                ))}
              </div>

              {filteredTerms.map((t) => {
                const badge = getStateBadge(t.status);
                return (
                  <div
                    key={t.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "220px 140px 1fr 120px 140px",
                      borderTop: "1px solid var(--border-dim)",
                    }}
                  >
                    {/* Canonical Term */}
                    <div className="text-mono-data" style={{ padding: "14px", fontSize: 12, color: "var(--fg-primary)", borderRight: "1px solid var(--border-dim)" }}>
                      {t.canonicalTerm}
                      {t.governanceNote && (
                        <div className="text-mono-label" style={{ fontSize: 11.5, color: "var(--status-warn)", marginTop: 4, lineHeight: 1.4 }}>
                          {t.governanceNote}
                        </div>
                      )}
                    </div>

                    {/* Category */}
                    <div style={{ padding: "14px", borderRight: "1px solid var(--border-dim)" }}>
                      <span className="badge badge-dim" style={{ fontSize: 11 }}>
                        {t.category}
                      </span>
                    </div>

                    {/* Synonyms */}
                    <div style={{ padding: "14px", borderRight: "1px solid var(--border-dim)" }}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {t.synonyms.map((s) => (
                          <span
                            key={s}
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 12,
                              color: "var(--fg-secondary)",
                              padding: "2px 6px",
                              backgroundColor: "var(--bg-surface)",
                              border: "1px solid var(--border-dim)",
                            }}
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Status */}
                    <div style={{ padding: "14px", borderRight: "1px solid var(--border-dim)", display: "flex", alignItems: "center" }}>
                      <span
                        className="badge"
                        style={{
                          color: badge.color,
                          borderColor: badge.color,
                          fontSize: 11.5,
                        }}
                      >
                        {badge.label}
                      </span>
                    </div>

                    {/* Actions */}
                    <div style={{ padding: "14px", display: "flex", alignItems: "center" }}>
                      {t.status === "FIRST SEEN" ? (
                        <button
                          onClick={() => approveTerm(t.id)}
                          className="btn-primary"
                          style={{ padding: "4px 10px", fontSize: 11.5 }}
                        >
                          <Check size={12} weight="bold" />
                          APPROVE
                        </button>
                      ) : t.status === "FLAGGED" ? (
                        <span className="text-mono-label" style={{ fontSize: 11.5, color: "var(--accent)" }}>
                          REQUIRES AUDIT
                        </span>
                      ) : (
                        <span className="text-mono-label" style={{ fontSize: 11.5, color: "var(--status-ok)" }}>
                          ✓ APPROVED
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
