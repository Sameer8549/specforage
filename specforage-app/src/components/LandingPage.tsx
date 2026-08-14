"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CheckCircle } from "@phosphor-icons/react";

/* ─────────────────────────────────────────────────────────────
   Pipeline stage data
   ───────────────────────────────────────────────────────────── */
const STAGES = [
  { id: "01", label: "Clean",               desc: "Strip placeholders, flag nulls" },
  { id: "02", label: "Resolve Mfr / Brand", desc: "Fuzzy-match to canonical form" },
  { id: "03", label: "Classify",            desc: "UNSPSC code, classpath, attributes" },
  { id: "04", label: "Extract",             desc: "Attributes from description and source" },
  { id: "05", label: "Normalize",           desc: "UOM and decimal fractions standard" },
  { id: "06", label: "Verify",              desc: "Entailment check per field" },
  { id: "07", label: "Adjudicate",          desc: "Deterministic conflict resolution" },
  { id: "08", label: "Build Description",   desc: "Formula-based slot templates" },
  { id: "09", label: "Audit",               desc: "Coverage, confidence, review flags" },
  { id: "10", label: "Map Output",          desc: "Delivery format columns" },
];

/* ─────────────────────────────────────────────────────────────
   Mechanism panels
   ───────────────────────────────────────────────────────────── */
const PANELS = [
  {
    tag: "UNSPSC Taxonomy",
    heading: "Universal Classification",
    body: "Anchored directly to the public UNSPSC taxonomy across 55,000+ commodity codes. No category-specific setup. The same pipeline processes dishwashers, pipe fittings, circuit breakers, and ball valves.",
  },
  {
    tag: "Source Discipline",
    heading: "Official Manufacturer Sources",
    body: "When web retrieval is needed, queries are strictly restricted to the resolved manufacturer's verified domain. Marketplaces and distributor sites are hard-blocked to avoid dirty data.",
  },
  {
    tag: "Vocabulary Governance",
    heading: "Controlled Vocabularies",
    body: "Extracted values are resolved against governed dictionaries. Values are classified as Matched, First Seen, or Flagged for Review so nothing enters your catalog unverified.",
  },
];

/* ─────────────────────────────────────────────────────────────
   Sample input / output rows
   ───────────────────────────────────────────────────────────── */
const INPUT_ROWS = [
  { field: "MPN",         value: "FGID2466QF4A",                      isPlaceholder: false },
  { field: "Description", value: "24 in Built-In Dishwasher EvenDry", isPlaceholder: false },
  { field: "Brand",       value: "-- No Unilog Brand --",             isPlaceholder: true  },
  { field: "Manufacturer",value: "Frigidare",                         isPlaceholder: false },
  { field: "Category",    value: "Major Appliances",                  isPlaceholder: false },
];

const OUTPUT_ROWS = [
  { field: "UNSPSC Code",  value: "40181501",                state: "MATCHED"    },
  { field: "Classpath",    value: "Appliances / Dishwashers",state: "MATCHED"    },
  { field: "Brand",        value: "Frigidaire",              state: "MATCHED"    },
  { field: "Manufacturer", value: "Frigidaire Company",      state: "MATCHED"    },
  { field: "Finish",       value: "Stainless Steel",         state: "FIRST SEEN" },
];

function stateColor(state: string) {
  if (state === "MATCHED")    return "var(--status-ok)";
  if (state === "FIRST SEEN") return "var(--status-warn)";
  return "var(--accent)";
}

/* ─────────────────────────────────────────────────────────────
   Animated Pipeline Column
   ───────────────────────────────────────────────────────────── */
function PipelineColumn() {
  const reduce = useReducedMotion();
  const [activeIdx, setActiveIdx] = useState(-1);
  const [done, setDone] = useState<Set<number>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (reduce) {
      setDone(new Set(STAGES.map((_, i) => i)));
      return;
    }
    let cur = 0;
    const delay = setTimeout(() => {
      setActiveIdx(0);
      timerRef.current = setInterval(() => {
        cur += 1;
        if (cur >= STAGES.length) {
          setActiveIdx(-1);
          setDone(new Set(STAGES.map((_, i) => i)));
          if (timerRef.current) clearInterval(timerRef.current);
        } else {
          setActiveIdx(cur);
          setDone((prev) => {
            const next = new Set(prev);
            next.add(cur - 1);
            return next;
          });
        }
      }, 380);
    }, 700);
    return () => {
      clearTimeout(delay);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [reduce]);

  const allDone = done.size === STAGES.length;

  return (
    <div
      className="pipeline-col"
      style={{
        borderLeft: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "var(--bg-surface)",
      }}
    >
      {/* Column header */}
      <div
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <span className="text-mono-label" style={{ fontSize: 11, color: "var(--fg-primary)", fontWeight: 600 }}>
          10-Stage Deterministic Pipeline
        </span>
        <span
          className="text-mono-label"
          style={{ color: allDone ? "var(--status-ok)" : "var(--fg-dim)", fontSize: 12 }}
        >
          {allDone ? "Complete" : "Scanning"}
        </span>
      </div>

      {/* Stage cells */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {STAGES.map((stage, i) => {
          const isActive   = activeIdx === i;
          const isComplete = done.has(i);
          return (
            <motion.div
              key={stage.id}
              className="stage-cell"
              style={{
                borderLeftColor: isActive
                  ? "var(--accent)"
                  : isComplete
                  ? "var(--status-ok)"
                  : "transparent",
                backgroundColor: isActive ? "var(--bg-elevated)" : "transparent",
                padding: "12px 20px",
              }}
              initial={reduce ? false : { opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: i * 0.045, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Stage number */}
              <span
                className="text-mono-data"
                style={{
                  color: isActive
                    ? "var(--accent)"
                    : isComplete
                    ? "var(--status-ok)"
                    : "var(--mono-meta)",
                  flexShrink: 0,
                  width: 22,
                  fontSize: 11,
                }}
              >
                {stage.id}
              </span>

              {/* Stage info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  className="text-mono-data"
                  style={{
                    color: isActive
                      ? "var(--fg-primary)"
                      : isComplete
                      ? "var(--fg-secondary)"
                      : "var(--fg-dim)",
                    marginBottom: 2,
                    fontSize: 11.5,
                    fontWeight: 500,
                  }}
                >
                  {stage.label}
                </div>
                <div className="text-mono-label" style={{ fontSize: 12, lineHeight: 1.3, color: "var(--fg-dim)" }}>
                  {stage.desc}
                </div>
              </div>

              {/* State indicator */}
              {isComplete && (
                <CheckCircle size={13} weight="bold" style={{ color: "var(--status-ok)", flexShrink: 0 }} />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main Landing Page
   ───────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const reduce = useReducedMotion();
  const ease   = [0.16, 1, 0.3, 1] as const;

  return (
    <>
      <div className="noise-overlay" aria-hidden="true" />

      <main style={{ paddingTop: 52 }}>
        {/* ════════════════════════════════
            HERO
            ════════════════════════════════ */}
        <section
          className="hero-grid"
          style={{
            minHeight: "calc(100dvh - 52px)",
            width: "100%",
            display: "grid",
            gridTemplateColumns: "1fr 420px",
            borderLeft:  "1px solid var(--border)",
            borderRight: "1px solid var(--border)",
          }}
        >
          {/* Left: copy */}
          <div
            className="section-pad"
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "72px 56px",
              borderRight: "1px solid var(--border)",
            }}
          >
            {/* Header tag */}
            <motion.div
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.1 }}
              style={{ marginBottom: 24 }}
            >
              <span
                className="text-mono-label"
                style={{
                  color: "var(--accent)",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                }}
              >
                Industrial Product Intelligence
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="text-display"
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease }}
              style={{ fontSize: "clamp(2.8rem, 5vw, 5.5rem)", marginBottom: 24, lineHeight: 1.05 }}
            >
              RAW CATALOG
              <br />
              <span style={{ color: "var(--accent)" }}>→</span> STRUCTURED
              <br />
              RECORD.
            </motion.h1>

            {/* Subtext */}
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35, ease }}
              style={{
                fontSize: 15,
                color: "var(--fg-secondary)",
                lineHeight: 1.65,
                maxWidth: 520,
                marginBottom: 36,
              }}
            >
              SpecForge transforms messy distributor catalog rows (Manufacturer Part Numbers, truncated descriptions, placeholder brands, and informal naming) into verified, UNSPSC-anchored, controlled-vocabulary product records ready for industrial commerce.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5, ease }}
              style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}
            >
              <Link href="/pipeline" className="btn-primary">
                Open Pipeline
                <ArrowRight size={14} weight="bold" />
              </Link>
              <Link href="/batch" className="btn-ghost">
                Batch CSV Upload
                <ArrowUpRight size={13} />
              </Link>
            </motion.div>

            {/* Feature pill list */}
            <motion.div
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.65 }}
              style={{ display: "flex", gap: 8, marginTop: 44, flexWrap: "wrap" }}
            >
              {["Public UNSPSC v25", "10-Stage Pipeline", "Official Mfr Domains Only", "Zero Hallucinations"].map((t) => (
                <span key={t} className="badge badge-dim" style={{ fontSize: 12, padding: "3px 8px" }}>
                  {t}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Right: animated pipeline */}
          <PipelineColumn />
        </section>

        {/* ════════════════════════════════
            HOW IT WORKS
            ════════════════════════════════ */}
        <section
          style={{
            width: "100%",
            borderTop:   "1px solid var(--border)",
          }}
        >
          {/* Section heading row */}
          <div
            className="section-pad"
            style={{
              padding: "40px 56px 32px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <h2
              className="text-display"
              style={{ fontSize: "clamp(1.6rem, 2.5vw, 2.4rem)" }}
            >
              HOW IT WORKS.
            </h2>
          </div>

          {/* Three mechanism panels */}
          <div
            className="three-col"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {PANELS.map((panel, i) => (
              <motion.div
                key={panel.tag}
                initial={reduce ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: i * 0.1, ease }}
                className="section-pad"
                style={{
                  padding: "40px 36px",
                  borderRight: i < 2 ? "1px solid var(--border)" : "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                <span className="text-mono-label" style={{ color: "var(--accent)", fontSize: 11, fontWeight: 600 }}>
                  {panel.tag}
                </span>
                <h3
                  className="text-display"
                  style={{ fontSize: "1.4rem" }}
                >
                  {panel.heading}
                </h3>
                <p style={{ fontSize: 13.5, color: "var(--fg-secondary)", lineHeight: 1.6 }}>
                  {panel.body}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ════════════════════════════════
            INPUT → OUTPUT EXAMPLE
            ════════════════════════════════ */}
        <section
          style={{
            width: "100%",
            borderTop:   "1px solid var(--border)",
          }}
        >
          <div
            className="two-col"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}
          >
            {/* Raw input */}
            <div
              className="section-pad"
              style={{ padding: "40px 48px", borderRight: "1px solid var(--border)" }}
            >
              <div className="text-mono-label" style={{ marginBottom: 16, fontSize: 11, color: "var(--fg-dim)" }}>
                Raw Distributor Input
              </div>
              <div style={{ border: "1px solid var(--border)" }}>
                {INPUT_ROWS.map((row, i) => (
                  <div
                    key={row.field}
                    className="data-row"
                    style={{
                      gridTemplateColumns: "130px 1fr",
                      borderTop: i > 0 ? "1px solid var(--border-dim)" : "none",
                    }}
                  >
                    <div
                      className="data-cell"
                      style={{
                        color: "var(--mono-meta)",
                        borderRight: "1px solid var(--border-dim)",
                        fontSize: 11,
                      }}
                    >
                      {row.field}
                    </div>
                    <div
                      className="data-cell"
                      style={{
                        color: row.isPlaceholder ? "var(--fg-dim)" : "var(--fg-primary)",
                        fontStyle: row.isPlaceholder ? "italic" : "normal",
                        fontSize: 12,
                      }}
                    >
                      {row.isPlaceholder ? "— (stripped placeholder)" : row.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Structured output */}
            <div className="section-pad" style={{ padding: "40px 48px" }}>
              <div className="text-mono-label" style={{ marginBottom: 16, fontSize: 11, color: "var(--status-ok)" }}>
                Governed Structured Output
              </div>
              <div style={{ border: "1px solid var(--border)" }}>
                {OUTPUT_ROWS.map((row, i) => (
                  <div
                    key={row.field}
                    className="data-row"
                    style={{
                      gridTemplateColumns: "130px 1fr auto",
                      borderTop: i > 0 ? "1px solid var(--border-dim)" : "none",
                    }}
                  >
                    <div
                      className="data-cell"
                      style={{
                        color: "var(--mono-meta)",
                        borderRight: "1px solid var(--border-dim)",
                        fontSize: 11,
                      }}
                    >
                      {row.field}
                    </div>
                    <div className="data-cell" style={{ color: "var(--fg-primary)", fontSize: 12 }}>
                      {row.value}
                    </div>
                    <div style={{ padding: "8px 12px", display: "flex", alignItems: "center" }}>
                      <span
                        className="badge"
                        style={{ color: stateColor(row.state), borderColor: stateColor(row.state), fontSize: 11.5 }}
                      >
                        {row.state}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════
            FOOTER CTA
            ════════════════════════════════ */}
        <footer
          style={{
            width: "100%",
            borderTop:   "1px solid var(--border)",
            padding: "48px 56px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 24,
          }}
        >
          <div>
            <div className="text-mono-label" style={{ marginBottom: 4, color: "var(--fg-primary)", fontSize: 12 }}>
              SpecForge Product Intelligence Platform
            </div>
            <div className="text-mono-label" style={{ color: "var(--fg-dim)", fontSize: 12 }}>
              Category-Agnostic UNSPSC Anchor · Official Manufacturer Domains Only · Zero Hallucination
            </div>
          </div>
          <Link href="/pipeline" className="btn-primary">
            Start Processing
            <ArrowRight size={14} weight="bold" />
          </Link>
        </footer>
      </main>
    </>
  );
}
