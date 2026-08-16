"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { SpecForgeRecord } from "@/lib/specforgeApi";
import { adjudicationInvoked, getSessionAuditRecords } from "@/lib/sessionAudit";

const data = (value: unknown) => value && typeof value === "object" ? value as Record<string, unknown> : {};

export default function AdminPage() {
  const [records, setRecords] = useState<SpecForgeRecord[]>([]);
  const refresh = useCallback(() => setRecords(getSessionAuditRecords()), []);
  useEffect(() => {
    const initialRefresh = window.setTimeout(refresh, 0);
    window.addEventListener("specforge:audit-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => { window.clearTimeout(initialRefresh); window.removeEventListener("specforge:audit-updated", refresh); window.removeEventListener("storage", refresh); };
  }, [refresh]);
  const metrics = useMemo(() => {
    const lookups = records.filter((record) => data(record.brand_resolution).mpn_lookup_attempted === true);
    const hits = lookups.filter((record) => data(record.brand_resolution).mpn_lookup_cache_hit === true).length;
    const adjudicated = records.filter(adjudicationInvoked).length;
    const forced = records.filter((record) => data(record.adjudicate).forced === true).length;
    return { lookups: lookups.length, hits, adjudicated, forced };
  }, [records]);
  const percent = (part: number, total: number) => total ? `${(part / total * 100).toFixed(1)}%` : "N/A";
  return <main className="admin-page">
    <div className="noise-overlay" aria-hidden="true" />
    <header className="artifacts-hero"><div><div className="text-mono-label" style={{ color: "var(--accent)", marginBottom: 12 }}>[ Operations / Session Evidence ]</div><h1 className="text-display">Narrow by design.</h1></div><p>Cost-efficiency signals computed from complete traces processed in this browser. This is a transparent session view, not a global production analytics claim.</p></header>
    <section className="admin-metrics">
      <div><span className="text-mono-label">Processed</span><strong>{records.length}</strong><small>complete records</small></div>
      <div><span className="text-mono-label">Cache hit rate</span><strong>{percent(metrics.hits, metrics.lookups)}</strong><small>{metrics.hits} hits / {metrics.lookups} MPN lookups</small></div>
      <div><span className="text-mono-label">Adjudicate invoked</span><strong>{percent(metrics.adjudicated, records.length)}</strong><small>{metrics.adjudicated} of {records.length} items</small></div>
      <div><span className="text-mono-label">Forced demos</span><strong>{metrics.forced}</strong><small>excluded from narrow-use interpretation</small></div>
    </section>
    <section className="artifact-section">
      <div className="artifact-section-heading"><div><div className="text-mono-label" style={{ color: "var(--accent)" }}>Trace index</div><h2 className="text-display">Observed calls.</h2></div><p>Cache rate only uses records where an MPN lookup was attempted. Adjudication frequency uses the backend&apos;s explicit <code>llm_invoked</code> field.</p></div>
      {!records.length ? <div className="admin-empty">No session traces yet. <Link href="/pipeline">Run the Playground</Link> to populate this view.</div> : <div className="artifact-table-wrap"><table className="artifact-table admin-table"><thead><tr><th>MPN</th><th>UNSPSC</th><th>Confidence</th><th>MPN cache</th><th>Adjudicate</th><th>Review</th></tr></thead><tbody>{records.map((record) => {
        const input = data(record.input); const classify = data(record.classify); const resolution = data(record.brand_resolution); const adjudicate = data(record.adjudicate); const audit = data(record.audit);
        return <tr key={record.item_id}><td className="text-mono-data">{String(input.mfg_part_num || "—")}</td><td>{String(classify.unspsc_code || "—")}</td><td>{typeof classify.confidence === "number" ? classify.confidence.toFixed(3) : "—"}</td><td>{resolution.mpn_lookup_attempted ? resolution.mpn_lookup_cache_hit ? "Hit" : "Miss" : "Not used"}</td><td>{adjudicationInvoked(record) ? adjudicate.forced ? "Forced" : "Invoked" : "Skipped"}</td><td>{audit.routed_to_review ? "Required" : "Cleared"}</td></tr>;
      })}</tbody></table></div>}
    </section>
  </main>;
}
