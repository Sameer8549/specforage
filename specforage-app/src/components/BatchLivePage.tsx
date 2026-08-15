"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle, Warning } from "@phosphor-icons/react";
import { BatchStatus, getBatchStatus, InputRow, startBatch } from "@/lib/specforgeApi";

export default function BatchLivePage() {
  const [status, setStatus] = useState<BatchStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function run() {
      try {
        const raw = sessionStorage.getItem("sf_batch");
        if (!raw) throw new Error("No uploaded batch was found. Return to Input and upload a CSV first.");
        const parsed = JSON.parse(raw) as { rows?: InputRow[] };
        if (!parsed.rows?.length) throw new Error("The uploaded batch contains no rows.");
        const accepted = await startBatch(parsed.rows, controller.signal);
        setStarting(false);
        const poll = async () => {
          const current = await getBatchStatus(accepted.status_url, controller.signal);
          setStatus(current);
          if (current.status === "queued" || current.status === "running") timer = setTimeout(poll, 1200);
        };
        await poll();
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setStarting(false);
        setError(reason instanceof Error ? reason.message : "Batch processing failed.");
      }
    }
    void run();
    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <main style={{ padding: "96px 48px 64px", minHeight: "100dvh" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div className="text-mono-label" style={{ color: "var(--accent)" }}>LIVE ASYNCHRONOUS JOB</div>
        <h1 className="text-display" style={{ fontSize: "clamp(2rem, 5vw, 4.5rem)", marginTop: 10 }}>BATCH PROCESSING.</h1>
        <p style={{ color: "var(--fg-secondary)", maxWidth: 720, marginTop: 14 }}>Rows and statuses below come from the backend <code>/batch</code> job. Closing this page does not fabricate completion.</p>

        {starting ? <p aria-live="polite" style={{ marginTop: 48 }}>Uploading CSV and creating the backend job…</p> : null}
        {error ? (
          <div role="alert" style={{ border: "1px solid var(--status-warn)", padding: 20, marginTop: 36 }}>
            <Warning size={18} /> <span style={{ marginLeft: 9 }}>{error}</span>
            <div style={{ marginTop: 18 }}><Link href="/pipeline" className="btn-ghost">RETURN TO INPUT <ArrowRight size={15} /></Link></div>
          </div>
        ) : null}

        {status ? (
          <>
            <div style={{ display: "flex", gap: 22, flexWrap: "wrap", marginTop: 34, padding: "18px 0", borderBlock: "1px solid var(--border)" }}>
              <span><strong>{status.total_rows}</strong> total</span>
              <span style={{ color: "var(--status-ok)" }}><strong>{status.completed_rows}</strong> completed</span>
              <span style={{ color: status.failed_rows ? "var(--status-warn)" : "var(--fg-secondary)" }}><strong>{status.failed_rows}</strong> failed</span>
              <span className="text-mono-label">{status.status.replaceAll("_", " ")}</span>
            </div>
            <div style={{ overflowX: "auto", marginTop: 26 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                <thead><tr>{["ROW", "MPN", "CLASSIFICATION", "COVERAGE", "STATE", "REVIEW"].map((heading) => <th key={heading} className="text-mono-label" style={{ textAlign: "left", padding: "12px 10px", borderBottom: "1px solid var(--border)" }}>{heading}</th>)}</tr></thead>
                <tbody>{status.rows.map((row) => {
                  const input = row.record?.input as Record<string, unknown> | undefined;
                  const classify = row.record?.classify as Record<string, unknown> | undefined;
                  const audit = row.record?.audit as Record<string, unknown> | undefined;
                  return (
                    <tr key={row.row_number}>
                      <td style={{ padding: "14px 10px", borderBottom: "1px solid var(--border-dim)" }}>{row.row_number}</td>
                      <td style={{ padding: "14px 10px", borderBottom: "1px solid var(--border-dim)" }}>{String(input?.mfg_part_num || "—")}</td>
                      <td style={{ padding: "14px 10px", borderBottom: "1px solid var(--border-dim)" }}>{String(classify?.classpath || "—")}</td>
                      <td style={{ padding: "14px 10px", borderBottom: "1px solid var(--border-dim)" }}>{typeof audit?.coverage_percent === "number" ? `${audit.coverage_percent}%` : "—"}</td>
                      <td style={{ padding: "14px 10px", borderBottom: "1px solid var(--border-dim)" }}>{row.state}</td>
                      <td style={{ padding: "14px 10px", borderBottom: "1px solid var(--border-dim)" }}>{row.record ? (audit?.routed_to_review ? <Warning size={17} /> : <CheckCircle size={17} />) : row.error || "—"}</td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
