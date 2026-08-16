"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle, Warning } from "@phosphor-icons/react";
import { readProcessedRecord } from "@/lib/recordAdapter";
import type { SpecForgeRecord } from "@/lib/specforgeApi";

type Adjudication = {
  needs_human_review?: boolean;
  reasoning?: string[];
  rejected_values?: Array<{ field?: string; value?: string; reason?: string; source_type?: string }>;
  attributes?: Array<{ label?: string; value?: string; confidence?: number; source_type?: string }>;
};

export default function AdjudicationPage() {
  const [record, setRecord] = useState<SpecForgeRecord | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setRecord(readProcessedRecord()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  if (!record) return <Empty />;
  const data = (record.adjudicate || {}) as Adjudication;
  return (
    <main style={{ padding: "96px 48px 64px", minHeight: "100dvh" }}>
      <div style={{ maxWidth: 1050, margin: "0 auto" }}>
        <div className="text-mono-label" style={{ color: "var(--accent)" }}>LIVE ADJUDICATION TRACE · {record.item_id}</div>
        <h1 className="text-display" style={{ fontSize: "clamp(2rem, 5vw, 4.5rem)", marginTop: 10 }}>CONFLICT DECISIONS.</h1>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 24, color: data.needs_human_review ? "var(--status-warn)" : "var(--status-ok)" }}>
          {data.needs_human_review ? <Warning size={18} /> : <CheckCircle size={18} />}
          <strong>{data.needs_human_review ? "HUMAN REVIEW REQUIRED" : "NO UNRESOLVED TOP-PRIORITY CONFLICT"}</strong>
        </div>
        <Section title="ACCEPTED ATTRIBUTES">
          {(data.attributes || []).map((attribute, index) => <Row key={`${attribute.label}-${index}`} label={attribute.label || "ATTRIBUTE"} value={`${attribute.value || "—"} · ${attribute.source_type || "unknown source"} · ${attribute.confidence?.toFixed(2) || "N/A"}`} />)}
          {(data.attributes || []).length === 0 ? <p style={{ color: "var(--fg-secondary)" }}>No adjudicated attributes were returned.</p> : null}
        </Section>
        <Section title="REJECTED VALUES">
          {(data.rejected_values || []).map((item, index) => <Row key={`${item.field}-${index}`} label={item.field || "FIELD"} value={`${item.value || "—"} — ${item.reason || "Rejected"}`} />)}
          {(data.rejected_values || []).length === 0 ? <p style={{ color: "var(--fg-secondary)" }}>No values were rejected.</p> : null}
        </Section>
        <Section title="REASONING">
          {(data.reasoning || []).map((reason, index) => <Row key={`${index}-${reason}`} label={`STEP ${index + 1}`} value={reason} />)}
          {(data.reasoning || []).length === 0 ? <p style={{ color: "var(--fg-secondary)" }}>Adjudication did not fire because no real conflict reached this stage.</p> : null}
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section style={{ marginTop: 40 }}><h2 className="text-display" style={{ fontSize: "1.4rem", marginBottom: 10 }}>{title}</h2>{children}</section>;
}
function Row({ label, value }: { label: string; value: string }) {
  return <div style={{ display: "grid", gridTemplateColumns: "minmax(150px, 220px) 1fr", gap: 18, borderTop: "1px solid var(--border)", padding: "14px 0" }}><span className="text-mono-label">{label}</span><span style={{ color: "var(--fg-secondary)" }}>{value}</span></div>;
}
function Empty() {
  return <main style={{ padding: "120px 48px", minHeight: "100dvh" }}><div style={{ maxWidth: 760, margin: "0 auto", borderTop: "1px solid var(--border)", paddingTop: 28 }}><div className="text-mono-label" style={{ color: "var(--accent)" }}>NO LIVE ADJUDICATION TRACE</div><h1 className="text-display" style={{ fontSize: "clamp(2rem, 5vw, 4rem)", marginTop: 12 }}>NO FABRICATED CONFLICTS.</h1><p style={{ color: "var(--fg-secondary)", margin: "18px 0 28px" }}>Process an item to inspect conflicts that genuinely occurred.</p><Link href="/pipeline" className="btn-primary">PROCESS AN ITEM <ArrowRight size={15} /></Link></div></main>;
}
