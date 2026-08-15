"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { readProcessedRecord } from "@/lib/recordAdapter";
import type { SpecForgeRecord } from "@/lib/specforgeApi";

type Provenance = { stage?: string; confidence?: number | null; source_type?: string | null; source_excerpt?: string | null };

export default function ProvenancePage() {
  const [record, setRecord] = useState<SpecForgeRecord | null>(null);
  useEffect(() => setRecord(readProcessedRecord()), []);
  if (!record) return <main style={{ padding: "120px 48px", minHeight: "100dvh" }}><div style={{ maxWidth: 760, margin: "0 auto", borderTop: "1px solid var(--border)", paddingTop: 28 }}><div className="text-mono-label" style={{ color: "var(--accent)" }}>NO LIVE PROVENANCE</div><h1 className="text-display" style={{ fontSize: "clamp(2rem, 5vw, 4rem)", marginTop: 12 }}>SOURCES MUST EXIST.</h1><p style={{ color: "var(--fg-secondary)", margin: "18px 0 28px" }}>Fabricated manufacturer searches and URLs have been removed. Process an item to inspect its actual source excerpts.</p><Link href="/pipeline" className="btn-primary">PROCESS AN ITEM <ArrowRight size={15} /></Link></div></main>;
  const output = (record.output_row || {}) as { provenance?: Record<string, Provenance> };
  const entries = Object.entries(output.provenance || {});
  return (
    <main style={{ padding: "96px 48px 64px", minHeight: "100dvh" }}><div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div className="text-mono-label" style={{ color: "var(--accent)" }}>LIVE FIELD PROVENANCE · {record.item_id}</div>
      <h1 className="text-display" style={{ fontSize: "clamp(2rem, 5vw, 4.5rem)", marginTop: 10 }}>TRACE EVERY VALUE.</h1>
      <p style={{ color: "var(--fg-secondary)", maxWidth: 720, marginTop: 14 }}>Only fields returned by the backend output mapper are shown. Blank source excerpts remain blank.</p>
      <div style={{ overflowX: "auto", marginTop: 32 }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}><thead><tr>{["FIELD", "STAGE", "SOURCE", "CONFIDENCE", "EXCERPT"].map((heading) => <th key={heading} className="text-mono-label" style={{ textAlign: "left", borderBottom: "1px solid var(--border)", padding: "12px 10px" }}>{heading}</th>)}</tr></thead><tbody>{entries.map(([field, source]) => <tr key={field}><td style={cell}>{field}</td><td style={cell}>{source.stage || "—"}</td><td style={cell}>{source.source_type || "—"}</td><td style={cell}>{source.confidence == null ? "N/A" : source.confidence.toFixed(2)}</td><td style={cell}>{source.source_excerpt || "—"}</td></tr>)}</tbody></table></div>
      {entries.length === 0 ? <p style={{ marginTop: 28, color: "var(--fg-secondary)" }}>The mapper returned no populated fields with provenance.</p> : null}
    </div></main>
  );
}

const cell: React.CSSProperties = { padding: "14px 10px", borderBottom: "1px solid var(--border-dim)", color: "var(--fg-secondary)", verticalAlign: "top" };
