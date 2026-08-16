"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { CheckCircle, FileCsv, SpinnerGap, UploadSimple, Warning } from "@phosphor-icons/react";
import { BatchStatus, getBatchStatus, startBatchCsv } from "@/lib/specforgeApi";

const REQUIRED_HEADERS = ["Mfg_Part_Num", "Part_Desc", "E1_Brand", "Unilog_Brand", "DIB_Brand", "Part_Manuf"];

function csvHeaders(text: string): string[] {
  const firstLine = text.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] || "";
  const cells: string[] = [];
  let value = ""; let quoted = false;
  for (let index = 0; index < firstLine.length; index += 1) {
    const char = firstLine[index];
    if (char === '"' && quoted && firstLine[index + 1] === '"') { value += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { cells.push(value.trim()); value = ""; }
    else value += char;
  }
  cells.push(value.trim());
  return cells;
}

export default function BatchLivePage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<BatchStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [jobStarted, setJobStarted] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { abortRef.current?.abort(); if (timerRef.current) clearTimeout(timerRef.current); }, []);

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] || null;
    setError(null); setStatus(null); setJobStarted(false);
    if (!selected) { setFile(null); return; }
    if (!selected.name.toLowerCase().endsWith(".csv")) { setFile(null); setError("Choose a .csv file."); return; }
    if (selected.size > 5 * 1024 * 1024) { setFile(null); setError("CSV exceeds the 5 MB browser upload limit."); return; }
    const headers = csvHeaders(await selected.text());
    const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
    if (missing.length) { setFile(null); setError(`Missing required columns: ${missing.join(", ")}`); return; }
    setFile(selected);
  }

  async function submit() {
    if (!file || starting) return;
    setStarting(true); setError(null); setStatus(null);
    const controller = new AbortController(); abortRef.current = controller;
    try {
      const accepted = await startBatchCsv(await file.text(), controller.signal);
      setJobStarted(true);
      const poll = async () => {
        const current = await getBatchStatus(accepted.status_url, controller.signal);
        setStatus(current);
        if (current.status === "queued" || current.status === "running") timerRef.current = setTimeout(poll, 1200);
      };
      await poll();
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError(reason instanceof Error ? reason.message : "Batch processing failed.");
    } finally { setStarting(false); }
  }

  return <main className="batch-page">
    <div className="noise-overlay" aria-hidden="true" />
    <header className="artifacts-hero"><div><div className="text-mono-label" style={{ color: "var(--accent)", marginBottom: 12 }}>[ Batch / Live Processing ]</div><h1 className="text-display">Process a catalog file.</h1></div><p>Upload the supplied six-column CSV format. The original CSV is sent intact to Railway, including quoted values and embedded commas.</p></header>
    {!jobStarted ? <section className="batch-upload-section">
      <label className="batch-dropzone"><UploadSimple size={32} /><span><strong>{file ? file.name : "Choose a CSV file"}</strong><small>{file ? `${(file.size / 1024).toFixed(1)} KB · ready to process` : "Required headers are validated before upload · maximum 5 MB"}</small></span><input type="file" accept=".csv,text/csv" onChange={chooseFile} /></label>
      <div className="batch-actions"><button className="btn-primary" type="button" disabled={!file || starting} onClick={submit}>{starting ? <SpinnerGap className="loading-spinner" size={16} /> : <FileCsv size={16} />}{starting ? "Creating batch job" : "Process CSV"}</button><span className="text-mono-label">{REQUIRED_HEADERS.join(" · ")}</span></div>
      {error ? <div className="playground-error" role="alert"><Warning size={18} /><div><strong>Upload failed</strong><p>{error}</p></div></div> : null}
    </section> : null}
    {jobStarted ? <section className="batch-results">
      <div className="section-heading-row"><div><div className="text-mono-label" style={{ color: "var(--accent)" }}>Real backend job</div><h2 className="text-display">Batch telemetry.</h2></div>{status ? <span className="badge badge-ok">{status.status.replaceAll("_", " ")}</span> : null}</div>
      {!status ? <p aria-live="polite"><SpinnerGap className="loading-spinner" size={16} /> Waiting for the first job status…</p> : <><div className="batch-metrics"><div><strong>{status.total_rows}</strong><span>Total</span></div><div><strong>{status.completed_rows}</strong><span>Completed</span></div><div><strong>{status.failed_rows}</strong><span>Failed</span></div></div><div className="artifact-table-wrap"><table className="artifact-table batch-table"><thead><tr>{["Row", "MPN", "Classification", "Coverage", "State", "Review"].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{status.rows.map((row) => {
        const input = row.record?.input as Record<string, unknown> | undefined; const classify = row.record?.classify as Record<string, unknown> | undefined; const audit = row.record?.audit as Record<string, unknown> | undefined;
        return <tr key={row.row_number}><td>{row.row_number}</td><td className="text-mono-data">{String(input?.mfg_part_num || "—")}</td><td>{String(classify?.classpath || "—")}</td><td>{typeof audit?.coverage_percent === "number" ? `${audit.coverage_percent}%` : "—"}</td><td>{row.state}</td><td>{row.record ? audit?.routed_to_review ? <Warning size={17} /> : <CheckCircle size={17} /> : row.error || "—"}</td></tr>;
      })}</tbody></table></div></>}
      {error ? <div className="playground-error" role="alert"><Warning size={18} /><div><strong>Batch job failed</strong><p>{error}</p></div></div> : null}
      <button type="button" className="btn-ghost" style={{ marginTop: 20 }} onClick={() => { abortRef.current?.abort(); setJobStarted(false); setStatus(null); setFile(null); setError(null); }}>Upload another file</button>
    </section> : null}
  </main>;
}
