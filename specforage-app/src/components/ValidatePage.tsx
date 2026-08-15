"use client";

import { useEffect, useState } from "react";
import { ArrowClockwise, CheckCircle, Warning } from "@phosphor-icons/react";
import { EvaluationResult, getEvaluation } from "@/lib/specforgeApi";

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div style={{ padding: 20, borderTop: "1px solid var(--border)", minWidth: 0 }}>
      <div className="text-mono-label" style={{ color: "var(--fg-dim)", marginBottom: 10 }}>{label}</div>
      <div className="text-display" style={{ fontSize: "clamp(1.6rem, 3vw, 2.6rem)", overflowWrap: "anywhere" }}>{value}</div>
      <p style={{ color: "var(--fg-secondary)", marginTop: 8 }}>{detail}</p>
    </div>
  );
}

function percent(value: number | null | undefined): string {
  return value == null ? "N/A" : `${value.toFixed(2)}%`;
}

export default function ValidatePage() {
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [run, setRun] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getEvaluation(controller.signal)
      .then(setResult)
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Evaluation failed.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [run]);

  return (
    <main style={{ padding: "96px 48px 64px", minHeight: "100dvh" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div className="text-mono-label" style={{ color: "var(--accent)", marginBottom: 10 }}>LIVE BACKEND EVALUATION</div>
            <h1 className="text-display" style={{ fontSize: "clamp(2rem, 5vw, 4.5rem)" }}>FORMAT &amp; VALIDATE.</h1>
            <p style={{ color: "var(--fg-secondary)", maxWidth: 700, marginTop: 14 }}>
              Metrics below come directly from the deployed <code>/eval</code> endpoint. The supplied benchmark currently contains two rows, not 200.
            </p>
          </div>
          <button className="btn-primary" type="button" disabled={loading} onClick={() => setRun((value) => value + 1)}>
            <ArrowClockwise size={15} /> {loading ? "RUNNING EVALUATION…" : "RUN AGAIN"}
          </button>
        </div>

        {error ? (
          <div role="alert" style={{ border: "1px solid var(--status-warn)", padding: 20, marginTop: 36 }}>
            <Warning size={18} style={{ color: "var(--status-warn)" }} /> <span style={{ marginLeft: 10 }}>{error}</span>
          </div>
        ) : null}

        {!result && loading ? (
          <div aria-live="polite" style={{ padding: "72px 0", color: "var(--fg-secondary)" }}>Processing the supplied ground-truth rows through all pipeline stages…</div>
        ) : null}

        {result ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", border: "1px solid var(--border)", marginTop: 36 }}>
              <Metric label="OVERALL ACCURACY" value={percent(result.accuracy.overall)} detail={`${result.evaluated_rows} supplied rows evaluated`} />
              <Metric label="MANUFACTURER" value={percent(result.accuracy.manufacturer)} detail="Exact populated ground-truth comparison" />
              <Metric label="BRAND" value={percent(result.accuracy.brand)} detail="Exact populated ground-truth comparison" />
              <Metric label="CLASSPATH" value={percent(result.accuracy.classpath)} detail="N/A when private and UNSPSC taxonomies are unmapped" />
              <Metric label="ATTRIBUTE COVERAGE" value={percent(result.attribute_coverage_percent)} detail={`${result.attribute_produced_fields} of ${result.attribute_expected_fields} expected values produced`} />
              <Metric label="VOCABULARY COMPLIANCE" value={percent(result.vocabulary_compliance_percent)} detail={`${result.vocabulary_compliance_evaluated_fields} produced values evaluated`} />
              <Metric label="DESCRIPTION LIMITS" value={percent(result.character_limit_compliance_percent)} detail={`${result.character_limit_compliant_fields} of ${result.character_limit_evaluated_fields} descriptions compliant`} />
              <Metric label="ROUTED TO REVIEW" value={percent(result.routed_to_review_percent)} detail="Cautious records requiring human review" />
            </div>

            <section style={{ marginTop: 44 }}>
              <h2 className="text-display" style={{ fontSize: "1.6rem", marginBottom: 16 }}>HONEST GAP REPORT</h2>
              {result.gap_report.map((item, index) => (
                <div key={item.item_id} style={{ padding: "18px 0", borderTop: "1px solid var(--border)" }}>
                  <div className="text-mono-label" style={{ color: "var(--accent)" }}>ROW {index + 1} · {item.item_id}</div>
                  <ul style={{ margin: "12px 0 0 20px", color: "var(--fg-secondary)" }}>
                    {item.gaps.map((gap) => <li key={gap} style={{ marginBottom: 7 }}>{gap}</li>)}
                  </ul>
                </div>
              ))}
              {result.gap_report.length === 0 ? <p><CheckCircle size={16} /> No gaps reported.</p> : null}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
