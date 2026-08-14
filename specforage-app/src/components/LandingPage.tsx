"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CheckCircle } from "@phosphor-icons/react";

/* ─────────────────────────────────────────────────────────────
   Pipeline stage data
   ───────────────────────────────────────────────────────────── */
const STAGES = [
  { id: "01", label: "CLEAN",               desc: "Strip placeholders, flag nulls" },
  { id: "02", label: "RESOLVE MFR / BRAND", desc: "Fuzzy-match to canonical form" },
  { id: "03", label: "CLASSIFY",            desc: "UNSPSC code + classpath + attributes" },
  { id: "04", label: "EXTRACT",             desc: "Attributes from description + source" },
  { id: "05", label: "NORMALIZE",           desc: "UOM / decimal → approved forms" },
  { id: "06", label: "VERIFY",              desc: "Entailment check per field" },
  { id: "07", label: "ADJUDICATE",          desc: "Conflict resolution with log" },
  { id: "08", label: "BUILD DESCRIPTION",   desc: "Formula-based description variants" },
  { id: "09", label: "AUDIT",               desc: "Coverage, confidence, flags" },
  { id: "10", label: "MAP OUTPUT",          desc: "Delivery Format columns" },
];

/* ─────────────────────────────────────────────────────────────
   Mechanism panels
   ───────────────────────────────────────────────────────────── */
const PANELS = [
  {
    tag: "UNSPSC TAXONOMY",
    heading: "ANY CATEGORY.",
    body: "Classification anchors to the public UNSPSC taxonomy — 55,000+ commodity codes. No category-specific configuration required. The same pipeline that processes a dishwasher processes a pipe fitting.",
  },
  {
    tag: "SOURCE DISCIPLINE",
    heading: "MANUFACTURER SOURCE ONLY.",
    body: "When web retrieval is needed, queries are restricted to the resolved manufacturer's official domain — never marketplaces, never distributors. Provenance is logged per field.",
  },
  {
    tag: "VOCABULARY GOVERNANCE",
    heading: "CONTROLLED VOCABULARY.",
    body: "Every extracted value is resolved against an approved vocabulary. Values are labeled First Seen, Matched, or Flagged for Review. Nothing passes through unlabeled.",
  },
];

/* ─────────────────────────────────────────────────────────────
   Sample input / output rows
   ───────────────────────────────────────────────────────────── */
const INPUT_ROWS = [
  { field: "MPN",         value: "FGID2466QF4A",                      isPlaceholder: false },
  { field: "DESCRIPTION", value: "24 in Built-In Dishwasher EvenDry", isPlaceholder: false },
  { field: "BRAND",       value: "-- No Unilog Brand --",             isPlaceholder: true  },
  { field: "MANUFACTURER",value: "Frigidare",                         isPlaceholder: false },
  { field: "CATEGORY",    value: "Major Appliances",                  isPlaceholder: false },
];

const OUTPUT_ROWS = [
  { field: "UNSPSC",       value: "40181501",                state: "MATCHED"    },
  { field: "CLASSPATH",    value: "Appliances / Dishwashers",state: "MATCHED"    },
  { field: "BRAND",        value: "Frigidaire",              state: "MATCHED"    },
  { field: "MANUFACTURER", value: "Frigidaire Company",      state: "MATCHED"    },
  { field: "FINISH",       value: "Stainless Steel",         state: "FIRST SEEN" },
];

function stateColor(state: string) {
  if (state === "MATCHED")    return "var(--status-ok)";
  if (state === "FIRST SEEN") return "var(--status-warn)";
  return "var(--accent)";
}

/* ─────────────────────────────────────────────────────────────
   Animated Pipeline Column — the authored sequence
   One pass on mount: stages scan left→right then lock complete
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
      }}
    >
      {/* Column header */}
      <div
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <span className="text-mono-label">PIPELINE / 10 STAGES</span>
        <span
          className="text-mono-label"
          style={{ color: allDone ? "var(--status-ok)" : "var(--fg-dim)", fontSize: 10 }}
        >
          {allDone ? "✓ COMPLETE" : "SCANNING..."}
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
                backgroundColor: isActive ? "var(--bg-surface)" : "transparent",
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
                    fontSize: 11,
                    letterSpacing: "0.07em",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {stage.label}
                </div>
                <div className="text-mono-label" style={{ fontSize: 9.5, lineHeight: 1.3 }}>
                  {stage.desc}
                </div>
              </div>

              {/* State icon */}
              {isComplete && (
                <CheckCircle size={13} weight="bold" style={{ color: "var(--status-ok)", flexShrink: 0 }} />
              )}
              {isActive && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    background: "var(--accent)",
                    display: "block",
                    flexShrink: 0,
                    animation: "pulse-dot 700ms infinite",
                  }}
                />
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
      {/* CRT noise overlay */}
      <div className="noise-overlay" aria-hidden="true" />

      <main style={{ paddingTop: 56 }}>

        {/* ════════════════════════════════
            HERO
            ════════════════════════════════ */}
        <section
          className="hero-grid"
          style={{
            minHeight: "calc(100dvh - 56px)",
            maxWidth: 1440,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 400px",
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
              padding: "80px 64px",
              borderRight: "1px solid var(--border)",
            }}
          >
            {/* System tag */}
            <motion.div
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.1 }}
              style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}
            >
              <span style={{ width: 6, height: 6, background: "var(--accent)", display: "block" }} />
              <span className="text-mono-label">PRODUCT INTELLIGENCE PIPELINE // V1.0</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="text-display"
              initial={reduce ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease }}
              style={{ fontSize: "clamp(3rem, 5.5vw, 6.5rem)", marginBottom: 24 }}
            >
              RAW CATALOG
              <br />
              <span style={{ color: "var(--accent)" }}>→</span> STRUCTURED
              <br />
              RECORD.
            </motion.h1>

            {/* Subtext */}
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35, ease }}
              style={{
                fontSize: 15,
                color: "var(--fg-secondary)",
                lineHeight: 1.65,
                maxWidth: 480,
                marginBottom: 40,
              }}
            >
              SpecForge takes a distributor catalog row — MPN, short description,
              brand fields, manufacturer — and returns a clean, UNSPSC-classified,
              vocabulary-controlled product record ready for industrial commerce.
              No category lock-in. No login required.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5, ease }}
              style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}
            >
              <Link href="/pipeline" className="btn-primary">
                OPEN PIPELINE
                <ArrowRight size={15} weight="bold" />
              </Link>
              <Link href="/batch" className="btn-ghost">
                UPLOAD CSV
                <ArrowUpRight size={14} />
              </Link>
            </motion.div>

            {/* Capability tags */}
            <motion.div
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.65 }}
              style={{ display: "flex", gap: 8, marginTop: 48, flexWrap: "wrap" }}
            >
              {["UNSPSC TAXONOMY", "10-STAGE PIPELINE", "MFR-SOURCE ONLY", "VOCABULARY CONTROLLED"].map((t) => (
                <span key={t} className="badge badge-dim">{t}</span>
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
            maxWidth: 1440,
            margin: "0 auto",
            borderLeft:  "1px solid var(--border)",
            borderRight: "1px solid var(--border)",
            borderTop:   "1px solid var(--border)",
          }}
        >
          {/* Section heading row */}
          <div
            className="section-pad"
            style={{
              padding: "48px 64px 40px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <h2
              className="text-display"
              style={{ fontSize: "clamp(1.6rem, 3vw, 2.8rem)" }}
            >
              HOW IT WORKS.
            </h2>
          </div>

          {/* Three mechanism panels */}
          <div
            className="three-col"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {PANELS.map((panel, i) => (
              <motion.div
                key={panel.tag}
                initial={reduce ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, delay: i * 0.1, ease }}
                className="section-pad"
                style={{
                  padding: "48px 40px",
                  borderRight: i < 2 ? "1px solid var(--border)" : "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                }}
              >
                <span className="text-mono-label" style={{ color: "var(--accent)" }}>
                  [ {panel.tag} ]
                </span>
                <h3
                  className="text-display"
                  style={{ fontSize: "clamp(1.3rem, 2.2vw, 1.9rem)" }}
                >
                  {panel.heading}
                </h3>
                <p style={{ fontSize: 14, color: "var(--fg-secondary)", lineHeight: 1.65 }}>
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
            maxWidth: 1440,
            margin: "0 auto",
            borderLeft:  "1px solid var(--border)",
            borderRight: "1px solid var(--border)",
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
              style={{ padding: "48px 56px", borderRight: "1px solid var(--border)" }}
            >
              <div className="text-mono-label" style={{ marginBottom: 20 }}>
                INPUT / RAW CATALOG ROW
              </div>
              <div style={{ border: "1px solid var(--border)" }}>
                {INPUT_ROWS.map((row, i) => (
                  <div
                    key={row.field}
                    className="data-row"
                    style={{
                      gridTemplateColumns: "120px 1fr",
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
                        /* Placeholder values rendered as visually blank — not as real content */
                        color: row.isPlaceholder ? "var(--fg-dim)" : "var(--fg-primary)",
                        fontStyle: row.isPlaceholder ? "italic" : "normal",
                      }}
                    >
                      {/* Placeholder brand values shown as dash, not the raw placeholder string */}
                      {row.isPlaceholder ? "—" : row.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Structured output */}
            <div className="section-pad" style={{ padding: "48px 56px" }}>
              <div className="text-mono-label" style={{ marginBottom: 20 }}>
                OUTPUT / STRUCTURED RECORD
              </div>
              <div style={{ border: "1px solid var(--border)" }}>
                {OUTPUT_ROWS.map((row, i) => (
                  <div
                    key={row.field}
                    className="data-row"
                    style={{
                      gridTemplateColumns: "120px 1fr auto",
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
                    <div className="data-cell" style={{ color: "var(--fg-primary)" }}>
                      {row.value}
                    </div>
                    <div style={{ padding: "10px 12px", display: "flex", alignItems: "center" }}>
                      <span
                        className="badge"
                        style={{ color: stateColor(row.state), borderColor: stateColor(row.state), fontSize: 9 }}
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
            maxWidth: 1440,
            margin: "0 auto",
            borderLeft:  "1px solid var(--border)",
            borderRight: "1px solid var(--border)",
            borderTop:   "1px solid var(--border)",
            padding: "56px 64px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 24,
          }}
        >
          <div>
            <div className="text-mono-label" style={{ marginBottom: 6 }}>
              SPECFORGE / PRODUCT INTELLIGENCE PIPELINE
            </div>
            <div className="text-mono-label" style={{ color: "var(--fg-dim)", fontSize: 10 }}>
              NO LOGIN. NO CATEGORY LOCK-IN. NO MARKETPLACE SOURCES.
            </div>
          </div>
          <Link href="/pipeline" className="btn-primary">
            START PROCESSING
            <ArrowRight size={15} weight="bold" />
          </Link>
        </footer>

      </main>
    </>
  );
}
