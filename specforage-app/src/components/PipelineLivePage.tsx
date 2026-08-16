"use client";

import { FormEvent, useEffect, useState } from "react";
import { CaretDown, CheckCircle, DownloadSimple, Play, SpinnerGap, Warning } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { processItem, SpecForgeRecord, StageObject } from "@/lib/specforgeApi";
import taxonomyBridge from "../../public/artifacts/taxonomy_bridge.json";

type DataObject = Record<string, unknown>;

const STAGES = [
  { key: "clean", number: "01", label: "Clean" },
  { key: "brand_resolution", number: "02", label: "Resolve Manufacturer / Brand" },
  { key: "classify", number: "03", label: "Classify" },
  { key: "extract", number: "04", label: "Extract" },
  { key: "normalize", number: "05", label: "Normalize & Constrain" },
  { key: "verify", number: "06", label: "Verify" },
  { key: "adjudicate", number: "07", label: "Adjudicate" },
  { key: "description", number: "08", label: "Build Description" },
  { key: "audit", number: "09", label: "Audit" },
  { key: "output_row", number: "10", label: "Output Mapper" },
] as const;

function object(value: unknown): DataObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as DataObject : {};
}

function array(value: unknown): DataObject[] {
  return Array.isArray(value) ? value.map(object) : [];
}

function text(value: unknown, fallback = "Not available"): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function score(value: unknown): string {
  return typeof value === "number" ? value.toFixed(3) : "Not scored";
}

function bridgeFor(value: unknown) {
  const code = typeof value === "string" ? value : "";
  return taxonomyBridge.mappings.find((mapping) => mapping.unspsc_code === code);
}

function TaxonomyPaths({ record }: { record: SpecForgeRecord }) {
  const classify = object(record.classify);
  const bridge = bridgeFor(classify.unspsc_code);
  if (!bridge) return null;
  return <div className="taxonomy-paths">
    <div><span className="text-mono-label">UNSPSC classpath</span><p>{text(classify.classpath)}</p></div>
    <div><span className="text-mono-label">Unilog-style bridge · {bridge.confidence} confidence</span><p>{bridge.unilog_style_classpath.replaceAll(">", " › ")}</p><small>{bridge.caveat}</small></div>
  </div>;
}

function Scalar({ value }: { value: unknown }) {
  if (value == null || value === "") return <span style={{ color: "var(--fg-dim)" }}>Not available</span>;
  if (typeof value === "boolean") return <span>{value ? "Yes" : "No"}</span>;
  if (typeof value === "object") return <pre className="trace-json">{JSON.stringify(value, null, 2)}</pre>;
  return <span>{String(value)}</span>;
}

function KeyValueGrid({ entries }: { entries: Array<[string, unknown]> }) {
  return <div className="trace-grid">{entries.map(([label, value]) => (
    <div className="trace-grid-row" key={label}>
      <div className="text-mono-label trace-grid-key">{label.replaceAll("_", " ")}</div>
      <div className="trace-grid-value"><Scalar value={value} /></div>
    </div>
  ))}</div>;
}

function Empty({ message }: { message: string }) {
  return <div className="trace-empty">{message}</div>;
}

function AttributeRows({ items, verification }: { items: DataObject[]; verification?: DataObject[] }) {
  if (!items.length) return <Empty message="No attributes were produced in this stage." />;
  return <div className="attribute-list">{items.map((item, index) => {
    const check = verification?.find((entry) => entry.label === item.label);
    return <div className="attribute-row" key={`${text(item.label)}-${index}`}>
      <div>
        <div className="text-mono-data" style={{ fontWeight: 600 }}>{text(item.label)}</div>
        <div style={{ color: "var(--fg-primary)", marginTop: 3 }}>{text(item.value)}{item.uom ? ` ${String(item.uom)}` : ""}</div>
      </div>
      <div className="attribute-evidence">
        <span className={`badge ${check?.entailment === "supported" ? "badge-ok" : check?.entailment === "not_supported" ? "badge-error" : "badge-warn"}`}>{text(check?.entailment, "Not verified")}</span>
        <span className="badge badge-dim">{text(item.source_type, "No source")}</span>
        <span className="text-mono-label">Confidence {score(check?.confidence ?? item.confidence)}</span>
      </div>
      <blockquote className="source-excerpt">{text(item.source_excerpt, "No source excerpt returned")}</blockquote>
    </div>;
  })}</div>;
}

function StageBody({ stageKey, data, record }: { stageKey: string; data: StageObject; record: SpecForgeRecord }) {
  const stage = object(data);
  const verifyResults = array(object(record.verify).results);
  if (stageKey === "clean") return <KeyValueGrid entries={Object.entries(stage)} />;
  if (stageKey === "brand_resolution") {
    const manufacturer = object(stage.manufacturer);
    const brand = object(stage.brand);
    const cacheStatus = stage.mpn_lookup_attempted ? stage.mpn_lookup_cache_hit === true ? "Hit" : stage.mpn_lookup_cache_hit === false ? "Miss" : "Not reported" : "Not used";
    return <><KeyValueGrid entries={[
      ["manufacturer", manufacturer.canonical_name], ["manufacturer match score", score(manufacturer.confidence)],
      ["brand", brand.canonical_name], ["brand match score", score(brand.confidence)],
      ["resolution source", stage.manufacturer_source], ["MPN lookup attempted", stage.mpn_lookup_attempted],
      ["MPN lookup cache", cacheStatus], ["manufacturer domain", stage.manufacturer_domain],
    ]} /><KeyValueGrid entries={[["manufacturer candidates", manufacturer.candidates], ["brand candidates", brand.candidates], ["flags", stage.flags]]} /></>;
  }
  if (stageKey === "classify") return <>
    {bridgeFor(stage.unspsc_code) ? <div className="taxonomy-paths stage-taxonomy-paths"><div><span className="text-mono-label">UNSPSC classpath</span><p>{text(stage.classpath)}</p></div><div><span className="text-mono-label">Unilog-style bridge · {bridgeFor(stage.unspsc_code)?.confidence} confidence</span><p>{bridgeFor(stage.unspsc_code)?.unilog_style_classpath.replaceAll(">", " › ")}</p><small>{bridgeFor(stage.unspsc_code)?.caveat}</small></div></div> : null}
    <KeyValueGrid entries={[
      ["UNSPSC", stage.unspsc_code], ["confidence", score(stage.confidence)],
      ["expected attributes", stage.expected_attributes], ["sanity check used", stage.tie_break_used],
      ["decision", stage.tie_break_outcome], ["reasoning", stage.tie_break_reasoning], ["flags", stage.flags],
    ]} />
    <div className="trace-subhead">Top candidates</div>
    {array(stage.candidates).length ? <div className="candidate-list">{array(stage.candidates).map((candidate, index) => (
      <div className="candidate-row" key={`${text(candidate.value)}-${index}`}><span className="text-mono-label">{String(index + 1).padStart(2, "0")}</span><span>{text(candidate.value)}</span><span className="text-mono-data">{score(candidate.confidence)}</span></div>
    ))}</div> : <Empty message="No classification candidates were returned." />}
  </>;
  if (stageKey === "extract" || stageKey === "normalize") return <>
    {stageKey === "extract" ? <KeyValueGrid entries={[["manufacturer retrieval attempted", stage.retrieval_attempted], ["extraction failed", stage.extraction_failed], ["flags", stage.flags]]} /> : null}
    <AttributeRows items={array(stage.attributes)} verification={stageKey === "extract" ? verifyResults : undefined} />
  </>;
  if (stageKey === "verify") {
    const results = array(stage.results);
    return results.length ? <div className="attribute-list">{results.map((result, index) => (
      <div className="attribute-row" key={`${text(result.label)}-${index}`}>
        <div className="verify-title"><span className="text-mono-data">{text(result.label)}</span><span className={`badge ${result.entailment === "supported" ? "badge-ok" : result.entailment === "not_supported" ? "badge-error" : "badge-warn"}`}>{text(result.entailment)}</span></div>
        <KeyValueGrid entries={[["value", result.value], ["confidence", score(result.confidence)], ["vocabulary compliant", result.vocabulary_compliant], ["UOM compliant", result.uom_compliant], ["reasoning", result.reasoning]]} />
      </div>
    ))}</div> : <Empty message="No attributes reached verification." />;
  }
  if (stageKey === "adjudicate") return <>
    <KeyValueGrid entries={[["needs human review", stage.needs_human_review], ["reasoning", stage.reasoning], ["rejected values", stage.rejected_values]]} />
    <div className="trace-subhead">Final adjudicated attributes</div><AttributeRows items={array(stage.attributes)} verification={verifyResults} />
  </>;
  if (stageKey === "description") {
    const compliance = object(stage.field_compliance);
    const keys = ["mobile_desc", "invoice_desc", "short_desc", "long_desc1", "retail_desc", "marketing_description"];
    return <div className="description-list">{keys.map((key) => {
      const deliveryKey = key === "long_desc1" ? "LONG_DESC1" : key.toUpperCase();
      return <div className="description-row" key={key}>
        <div className="description-heading"><span className="text-mono-label">{deliveryKey}</span><span className={`badge ${compliance[deliveryKey] ? "badge-ok" : "badge-warn"}`}>{compliance[deliveryKey] ? "Compliant" : "Flagged"}</span></div>
        <div>{text(stage[key])}</div><div className="text-mono-label">{typeof stage[key] === "string" ? `${stage[key].length} characters` : "No value"}</div>
      </div>;
    })}</div>;
  }
  if (stageKey === "audit") return <KeyValueGrid entries={Object.entries(stage)} />;
  if (stageKey === "output_row") {
    const populated = Object.entries(object(stage.values)).filter(([, value]) => value != null && value !== "");
    return <><TaxonomyPaths record={record} /><div className="trace-subhead">Populated Delivery Format fields ({populated.length})</div><KeyValueGrid entries={populated} /><div className="trace-subhead">Output provenance map</div><KeyValueGrid entries={Object.entries(object(stage.provenance))} /></>;
  }
  return <KeyValueGrid entries={Object.entries(stage)} />;
}

function StageDisclosure({ stage, record, defaultOpen }: { stage: typeof STAGES[number]; record: SpecForgeRecord; defaultOpen: boolean }) {
  const data = record[stage.key] as StageObject | null | undefined;
  if (!data) return null;
  return <details className="trace-stage" open={defaultOpen}>
    <summary><span className="stage-number">{stage.number}</span><span className="stage-name">{stage.label}</span><span className="badge badge-ok"><CheckCircle size={12} weight="fill" /> Complete</span><CaretDown className="stage-caret" size={16} /></summary>
    <div className="stage-body"><StageBody stageKey={stage.key} data={data} record={record} /></div>
  </details>;
}

function adjudicationFired(record: SpecForgeRecord): boolean {
  const adjudicate = object(record.adjudicate);
  return Boolean(adjudicate.needs_human_review || array(adjudicate.rejected_values).length || (Array.isArray(adjudicate.reasoning) && adjudicate.reasoning.length));
}

function DownloadButton({ record }: { record: SpecForgeRecord }) {
  function download() {
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `specforge-trace-${text(object(record.input).mfg_part_num, record.item_id)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return <button type="button" className="btn-ghost" onClick={download}><DownloadSimple size={15} /> Download full trace as JSON</button>;
}

function ProvenancePanel({ record }: { record: SpecForgeRecord }) {
  return <section className="provenance-panel" aria-labelledby="provenance-title">
    <div className="section-heading-row"><div><div className="text-mono-label" style={{ color: "var(--accent)" }}>Final evidence</div><h2 id="provenance-title" className="text-display">Attribute provenance.</h2></div><DownloadButton record={record} /></div>
    <TaxonomyPaths record={record} />
    <AttributeRows items={array(object(record.adjudicate).attributes)} verification={array(object(record.verify).results)} />
  </section>;
}

function LoadingTrace({ elapsed }: { elapsed: number }) {
  return <div className="loading-trace" aria-live="polite" aria-busy="true">
    <div className="loading-head"><SpinnerGap size={18} className="loading-spinner" /><span className="text-mono-data">Live pipeline running</span><span className="text-mono-label">{elapsed}s elapsed</span></div>
    {STAGES.map((stage, index) => <div className="loading-stage" key={stage.key} style={{ animationDelay: `${index * 90}ms` }}><span className="stage-number">{stage.number}</span><span>{stage.label}</span></div>)}
    <p>SpecForge returns one structured response after all stages complete. This page does not simulate intermediate results.</p>
  </div>;
}

export default function PipelineLivePage() {
  const [mpn, setMpn] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [record, setRecord] = useState<SpecForgeRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!loading) return;
    const started = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [loading]);

  const visibleStages = record ? STAGES.filter((stage) => stage.key !== "adjudicate" || adjudicationFired(record)) : [];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mpn.trim() || !description.trim() || loading) return;
    setLoading(true); setElapsed(0); setError(null); setRecord(null);
    try {
      const result = await processItem({ mpn, brand, description });
      setRecord(result);
      sessionStorage.setItem("sf_processed_record", JSON.stringify(result));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The live backend request failed.");
    } finally { setLoading(false); }
  }

  return <main className="playground-page">
    <div className="noise-overlay" aria-hidden="true" />
    <header className="playground-header"><div><div className="text-mono-label" style={{ color: "var(--accent)", marginBottom: 10 }}>[ Pipeline / Interactive Playground ]</div><h1 className="text-display">Run a real catalog item.</h1></div><p>Enter raw product evidence. The complete trace below comes directly from the deployed SpecForge backend.</p></header>
    <section className="playground-workspace">
      <form className="playground-form" onSubmit={submit}>
        <label><span className="text-mono-label">MPN *</span><input className="input-underline" value={mpn} onChange={(event) => setMpn(event.target.value)} placeholder="Manufacturer part number" required disabled={loading} /></label>
        <label><span className="text-mono-label">Brand</span><input className="input-underline" value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Optional brand evidence" disabled={loading} /></label>
        <label className="description-input"><span className="text-mono-label">Description *</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Raw distributor catalog description" required disabled={loading} rows={3} /></label>
        <button className="btn-primary process-button" type="submit" disabled={loading || !mpn.trim() || !description.trim()}>{loading ? <SpinnerGap className="loading-spinner" size={16} /> : <Play size={15} weight="fill" />}{loading ? "Processing" : "Process"}</button>
      </form>
      <div className="live-endpoint"><span className="badge badge-ok">Live</span><span className="text-mono-label">Railway /process</span></div>
    </section>
    <AnimatePresence mode="wait">
      {loading ? <motion.section key="loading" initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="playground-results"><LoadingTrace elapsed={elapsed} /></motion.section>
      : error ? <motion.section key="error" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} className="playground-results"><div className="playground-error" role="alert"><Warning size={18} /><div><strong>Processing failed</strong><p>{error}</p></div></div></motion.section>
      : record ? <motion.div key={record.item_id} initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="playground-results">
        <section className="result-summary"><div><span className="text-mono-label">Item</span><strong>{text(object(record.input).mfg_part_num)}</strong></div><div><span className="text-mono-label">UNSPSC</span><strong>{text(object(record.classify).unspsc_code)}</strong></div><div><span className="text-mono-label">Confidence</span><strong>{score(object(record.classify).confidence)}</strong></div><div><span className="text-mono-label">Review</span><strong>{object(record.audit).routed_to_review ? "Required" : "Cleared"}</strong></div><DownloadButton record={record} /></section>
        <section className="trace-section" aria-labelledby="trace-title"><div className="section-heading-row"><div><div className="text-mono-label" style={{ color: "var(--accent)" }}>Raw stage response</div><h2 id="trace-title" className="text-display">Pipeline trace.</h2></div><span className="text-mono-label">{visibleStages.length} stages shown</span></div><div className="trace-stages">{visibleStages.map((stage, index) => <StageDisclosure key={stage.key} stage={stage} record={record} defaultOpen={index === 0 || stage.key === "audit"} />)}</div></section>
        <ProvenancePanel record={record} />
      </motion.div>
      : <section className="playground-results" aria-label="Empty pipeline state"><div className="playground-empty"><span className="stage-number">01</span><p>Your first live trace will appear here after you submit an MPN and description.</p></div></section>}
    </AnimatePresence>
  </main>;
}
