"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle, Warning } from "@phosphor-icons/react";
import { processItem, SpecForgeRecord, StageObject } from "@/lib/specforgeApi";

const STAGES = [
  ["clean", "CLEAN"], ["brand_resolution", "RESOLVE MFR / BRAND"], ["classify", "CLASSIFY"],
  ["extract", "EXTRACT"], ["normalize", "NORMALIZE"], ["verify", "VERIFY"],
  ["adjudicate", "ADJUDICATE"], ["description", "BUILD DESCRIPTION"], ["audit", "AUDIT"], ["output_row", "MAP OUTPUT"],
] as const;

function display(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "YES" : "NO";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export default function PipelineLivePage() {
  const [record, setRecord] = useState<SpecForgeRecord | null>(null);
  const [selected, setSelected] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [mpn, setMpn] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    try {
      const raw = sessionStorage.getItem("sf_row");
      if (!raw) throw new Error("No input row was found. Return to Input and submit an item first.");
      const row = JSON.parse(raw) as { mpn?: string; description?: string; brand?: string; manufacturer?: string };
      if (!row.mpn?.trim() || !row.description?.trim()) throw new Error("The saved row is missing its MPN or description.");
      setMpn(row.mpn);
      setError(null);
      processItem(row, controller.signal).then((result) => {
        setRecord(result);
        setSelected(STAGES.length - 1);
        sessionStorage.setItem("sf_processed_record", JSON.stringify(result));
        if (result.output_row) sessionStorage.setItem("sf_output_row", JSON.stringify(result.output_row));
      }).catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Backend processing failed.");
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Saved input could not be read.");
    }
    return () => controller.abort();
  }, [retry]);

  const [stageKey, stageLabel] = STAGES[selected];
  const data = record?.[stageKey] as StageObject | null | undefined;

  return (
    <main style={{ paddingTop: 56, minHeight: "100dvh" }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(230px, 300px) 1fr", minHeight: "calc(100dvh - 56px)" }}>
        <aside style={{ borderRight: "1px solid var(--border)" }}>
          <div style={{ padding: 22, borderBottom: "1px solid var(--border)" }}><div className="text-mono-label" style={{ color: "var(--accent)" }}>LIVE BACKEND TRACE</div><div className="text-display" style={{ fontSize: "1.3rem", marginTop: 8 }}>{mpn || "AWAITING INPUT"}</div></div>
          {STAGES.map(([key, label], index) => (
            <button key={key} type="button" onClick={() => setSelected(index)} disabled={!record} style={{ width: "100%", textAlign: "left", border: 0, borderBottom: "1px solid var(--border-dim)", background: selected === index ? "var(--bg-surface)" : "transparent", color: record ? "var(--fg-primary)" : "var(--fg-dim)", padding: "13px 16px", cursor: record ? "pointer" : "default", display: "flex", gap: 10 }}>
              <span className="text-mono-label">{String(index + 1).padStart(2, "0")}</span><span>{label}</span>{record ? <CheckCircle size={14} style={{ marginLeft: "auto", color: "var(--status-ok)" }} /> : null}
            </button>
          ))}
        </aside>
        <section style={{ padding: "36px clamp(22px, 5vw, 56px)", minWidth: 0 }}>
          <div className="text-mono-label" style={{ color: "var(--accent)" }}>STAGE {selected + 1} OF {STAGES.length}</div>
          <h1 className="text-display" style={{ fontSize: "clamp(1.8rem, 4vw, 3.5rem)", marginTop: 8 }}>{stageLabel}.</h1>
          {error ? <div role="alert" style={{ border: "1px solid var(--status-warn)", padding: 20, marginTop: 28 }}><Warning size={18} /> <span style={{ marginLeft: 9 }}>{error}</span><div style={{ marginTop: 16 }}><button className="btn-primary" onClick={() => setRetry((value) => value + 1)}>RETRY</button></div></div> : null}
          {!record && !error ? <div aria-live="polite" style={{ marginTop: 44, color: "var(--fg-secondary)" }}>Processing the item through the backend. Stage details will appear only after the server returns evidence.</div> : null}
          {record && data ? <div style={{ border: "1px solid var(--border)", marginTop: 28 }}>{Object.entries(data).map(([key, value]) => <div key={key} style={{ display: "grid", gridTemplateColumns: "minmax(150px, 220px) minmax(0, 1fr)", borderTop: "1px solid var(--border-dim)" }}><div className="text-mono-label" style={{ padding: 12, borderRight: "1px solid var(--border-dim)" }}>{key.replaceAll("_", " ")}</div><pre style={{ margin: 0, padding: 12, whiteSpace: "pre-wrap", overflowWrap: "anywhere", color: "var(--fg-secondary)", font: "inherit" }}>{display(value)}</pre></div>)}</div> : null}
          {record ? <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}><Link href="/records" className="btn-primary">VIEW RECORD <ArrowRight size={15} /></Link><Link href="/audit" className="btn-ghost">VIEW AUDIT</Link></div> : null}
        </section>
      </div>
    </main>
  );
}
