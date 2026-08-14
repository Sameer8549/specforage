"use client";
import Link from "next/link";
import {
  TreeStructure,
  ShieldCheck,
  Globe,
  Gavel,
  CheckCircle,
  ArrowRight,
  Scales,
} from "@phosphor-icons/react";

export default function MethodologyPage() {
  return (
    <>
      <div className="noise-overlay" aria-hidden="true" />
      <main style={{ paddingTop: 52 }}>
        <div
          style={{
            maxWidth: 1440,
            margin: "0 auto",
            borderLeft: "1px solid var(--border)",
            borderRight: "1px solid var(--border)",
            minHeight: "calc(100dvh - 52px)",
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
                Architectural Methodology
              </div>
              <h1
                className="text-display"
                style={{ fontSize: "clamp(2rem, 3.5vw, 3.2rem)" }}
              >
                SYSTEM METHODOLOGY.
              </h1>
            </div>

            <div className="badge badge-dim" style={{ fontSize: 12 }}>
              STANDALONE ARCHITECTURAL RECORD · SPECFORGE CORE
            </div>
          </div>

          {/* ── Main Methodology Content ── */}
          <div style={{ padding: "48px", maxWidth: 960, display: "flex", flexDirection: "column", gap: 36 }}>
            {/* Pillar 1: Public UNSPSC Taxonomy */}
            <div style={{ border: "1px solid var(--border)", padding: "28px", backgroundColor: "var(--bg-surface)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <TreeStructure size={18} style={{ color: "var(--accent)" }} />
                <span className="text-mono-label" style={{ color: "var(--accent)", fontSize: 11, fontWeight: 600 }}>
                  Principle A: Public UNSPSC Taxonomy Generalization
                </span>
              </div>

              <h2 className="text-display" style={{ fontSize: "1.6rem", marginBottom: 12 }}>
                Universal Category-Agnostic Classification.
              </h2>

              <p style={{ fontSize: 14, color: "var(--fg-primary)", lineHeight: 1.7, marginBottom: 12 }}>
                SpecForge operates without proprietary, hard-coded category silos. Product records are classified and anchored directly against the public United Nations Standard Products and Services Code (UNSPSC) hierarchical taxonomy (Segments, Families, Classes, and 8-digit Commodities).
              </p>

              <div style={{ padding: "14px", backgroundColor: "var(--bg-root)", border: "1px solid var(--border-dim)" }}>
                <div className="text-mono-label" style={{ fontSize: 12, color: "var(--status-ok)", marginBottom: 4, fontWeight: 600 }}>
                  Why this generalizes across any industrial category:
                </div>
                <p className="text-mono-label" style={{ fontSize: 11, color: "var(--fg-secondary)", lineHeight: 1.5 }}>
                  Because the taxonomy schema is standardized across 55,000+ public commodity codes, the pipeline applies identical deterministic governance whether evaluating household dishwashers (40181501), high-pressure stainless steel pipe elbows (40141720), miniature circuit breakers (39121603), or industrial centrifugal pumps (23151501). Zero custom classification models are required for new verticals.
                </p>
              </div>
            </div>

            {/* Pillar 2: Strict Manufacturer Domain Only Web Retrieval */}
            <div style={{ border: "1px solid var(--border)", padding: "28px", backgroundColor: "var(--bg-surface)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <ShieldCheck size={18} style={{ color: "var(--status-ok)" }} />
                <span className="text-mono-label" style={{ color: "var(--status-ok)", fontSize: 11, fontWeight: 600 }}>
                  Principle B: Strict Manufacturer Domain Retrieval
                </span>
              </div>

              <h2 className="text-display" style={{ fontSize: "1.6rem", marginBottom: 12 }}>
                Restricted Web Retrieval & Zero-Contamination Sourcing.
              </h2>

              <p style={{ fontSize: 14, color: "var(--fg-primary)", lineHeight: 1.7, marginBottom: 12 }}>
                When attribute resolution requires external specification lookup, web retrieval queries are strictly restricted to verified official domains owned and operated by the resolved manufacturer (e.g. <code>site:frigidaire.com</code>, <code>site:swagelok.com</code>, <code>site:se.com</code>, <code>site:apollovalves.com</code>).
              </p>

              <div style={{ padding: "14px", backgroundColor: "var(--bg-root)", border: "1px solid var(--border-dim)" }}>
                <div className="text-mono-label" style={{ fontSize: 12, color: "var(--accent)", marginBottom: 4, fontWeight: 600 }}>
                  Hard-Enforced Distributor & Marketplace Blocklist:
                </div>
                <p className="text-mono-label" style={{ fontSize: 11, color: "var(--fg-secondary)", lineHeight: 1.5 }}>
                  SpecForge actively intercepts and drops all queries and extracts originating from third-party marketplaces (Amazon, eBay, Alibaba) or secondary distributors (Grainger, Home Depot, Ferguson, Zoro). This prevents hallucinated descriptions, non-canonical units, and secondary seller errors from contaminating master catalog records.
                </p>
              </div>
            </div>

            {/* Pillar 3: Deterministic Zero-Hallucination Description Generation */}
            <div style={{ border: "1px solid var(--border)", padding: "28px", backgroundColor: "var(--bg-surface)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <Scales size={18} style={{ color: "var(--fg-primary)" }} />
                <span className="text-mono-label" style={{ color: "var(--fg-primary)", fontSize: 11, fontWeight: 600 }}>
                  Principle C: Deterministic Formula Generation
                </span>
              </div>

              <h2 className="text-display" style={{ fontSize: "1.6rem", marginBottom: 12 }}>
                Tokenized Grammar Templates Over Free-Text LLMs.
              </h2>

              <p style={{ fontSize: 14, color: "var(--fg-primary)", lineHeight: 1.7 }}>
                Product descriptions across all 6 delivery channels (Mobile 50ch, Invoice 60ch, Short 80ch, Long 200ch, Retail 150ch, Marketing 500ch) are constructed via deterministic token slot replacement. LLMs are prohibited from authoring ungrounded free text.
              </p>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <Link href="/pipeline" className="btn-primary">
                Run Pipeline
                <ArrowRight size={14} weight="bold" />
              </Link>
              <Link href="/taxonomy" className="btn-ghost">
                Explore Taxonomy
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
