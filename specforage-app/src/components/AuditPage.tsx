"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle, Warning } from "@phosphor-icons/react";
import { readProcessedRecord } from "@/lib/recordAdapter";
import type { SpecForgeRecord } from "@/lib/specforgeApi";

type AuditData = {
  coverage_percent?: number;
  resolved_fields?: number;
  total_fields?: number;
  routed_to_review?: boolean;
  attribute_coverage_percent?: number | null;
  vocabulary_compliance_percent?: number | null;
  character_limit_compliance_percent?: number | null;
  flags?: Array<{ code?: string; field?: string; message?: string }>;
};

function value(number: number | null | undefined): string {
  return number == null ? "N/A" : `${number.toFixed(2)}%`;
}

export default function AuditPage() {
  const [record, setRecord] = useState<SpecForgeRecord | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setRecord(readProcessedRecord()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const audit = (record?.audit || {}) as AuditData;

  if (!record) {
    return (
      <main style={{ padding: "120px 48px", minHeight: "100dvh" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", borderTop: "1px solid var(--border)", paddingTop: 28 }}>
          <div className="text-mono-label" style={{ color: "var(--accent)" }}>NO LIVE RECORD</div>
          <h1 className="text-display" style={{ fontSize: "clamp(2rem, 5vw, 4rem)", marginTop: 12 }}>AUDIT NEEDS EVIDENCE.</h1>
          <p style={{ color: "var(--fg-secondary)", margin: "18px 0 28px" }}>Process an item first. This page no longer substitutes a fabricated review queue or scorecard.</p>
          <Link href="/pipeline" className="btn-primary">PROCESS AN ITEM <ArrowRight size={15} /></Link>
        </div>
      </main>
    );
  }

  const metrics = [
    ["FIELD COVERAGE", value(audit.coverage_percent), `${audit.resolved_fields ?? 0} of ${audit.total_fields ?? 0} fields resolved`],
    ["ATTRIBUTE COVERAGE", value(audit.attribute_coverage_percent), "Expected attributes with grounded produced values"],
    ["VOCABULARY", value(audit.vocabulary_compliance_percent), "Compliance among values actually produced"],
    ["DESCRIPTION LIMITS", value(audit.character_limit_compliance_percent), "Per-field character-rule compliance"],
  ];

  return (
    <main style={{ padding: "96px 48px 64px", minHeight: "100dvh" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="text-mono-label" style={{ color: "var(--accent)" }}>LIVE RECORD AUDIT · {record.item_id}</div>
        <h1 className="text-display" style={{ fontSize: "clamp(2rem, 5vw, 4.5rem)", marginTop: 10 }}>EVIDENCE, NOT OPTICS.</h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", border: "1px solid var(--border)", marginTop: 34 }}>
          {metrics.map(([label, metric, detail]) => (
            <div key={label} style={{ padding: 20, borderTop: "1px solid var(--border)" }}>
              <div className="text-mono-label" style={{ color: "var(--fg-dim)" }}>{label}</div>
              <div className="text-display" style={{ fontSize: "2.2rem", margin: "9px 0" }}>{metric}</div>
              <p style={{ color: "var(--fg-secondary)" }}>{detail}</p>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 28, color: audit.routed_to_review ? "var(--status-warn)" : "var(--status-ok)" }}>
          {audit.routed_to_review ? <Warning size={19} /> : <CheckCircle size={19} />}
          <strong>{audit.routed_to_review ? "ROUTED TO HUMAN REVIEW" : "AUDIT PASSED"}</strong>
        </div>
        <section style={{ marginTop: 36 }}>
          <h2 className="text-display" style={{ fontSize: "1.5rem" }}>REVIEW FLAGS</h2>
          {(audit.flags || []).map((flag, index) => (
            <div key={`${flag.code}-${flag.field}-${index}`} style={{ display: "grid", gridTemplateColumns: "minmax(150px, 220px) 1fr", gap: 18, borderTop: "1px solid var(--border)", padding: "14px 0" }}>
              <span className="text-mono-label">{flag.field || flag.code || "FIELD"}</span>
              <span style={{ color: "var(--fg-secondary)" }}>{flag.message || "Review required."}</span>
            </div>
          ))}
          {(audit.flags || []).length === 0 ? <p style={{ color: "var(--fg-secondary)", marginTop: 14 }}>No audit flags were returned.</p> : null}
        </section>
        <Link href="/validate" className="btn-ghost" style={{ marginTop: 30 }}>OPEN LIVE BENCHMARK <ArrowRight size={15} /></Link>
      </div>
    </main>
  );
}
