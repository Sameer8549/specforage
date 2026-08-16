export type StageObject = Record<string, unknown>;

export interface SpecForgeRecord {
  item_id: string;
  schema_version: string;
  created_at: string;
  updated_at: string;
  input: StageObject;
  clean?: StageObject | null;
  brand_resolution?: StageObject | null;
  classify?: StageObject | null;
  extract?: StageObject | null;
  normalize?: StageObject | null;
  verify?: StageObject | null;
  adjudicate?: StageObject | null;
  description?: StageObject | null;
  audit?: StageObject | null;
  output_row?: StageObject | null;
}

export interface InputRow {
  mpn?: string;
  description?: string;
  brand?: string;
  manufacturer?: string;
  forceAdjudication?: boolean;
}

export interface EvaluationResult {
  evaluated_rows: number;
  accuracy: Record<string, number | null>;
  vocabulary_compliance_percent: number | null;
  vocabulary_compliance_evaluated_fields: number;
  attribute_coverage_percent: number | null;
  attribute_produced_fields: number;
  attribute_expected_fields: number;
  character_limit_compliance_percent: number | null;
  character_limit_compliant_fields: number;
  character_limit_evaluated_fields: number;
  routed_to_review_percent: number;
  gap_report: Array<{ item_id: string; gaps: string[] }>;
}

export interface BatchStatus {
  job_id: string;
  status: "queued" | "running" | "completed" | "completed_with_errors";
  total_rows: number;
  completed_rows: number;
  failed_rows: number;
  rows: Array<{
    row_number: number;
    state: "pending" | "running" | "completed" | "failed";
    record: SpecForgeRecord | null;
    error: string | null;
    error_code: string | null;
  }>;
}

const API_BASE = (process.env.NEXT_PUBLIC_SPECFORGE_API_URL ?? "https://specforge-backend-production.up.railway.app")
  .replace(/\/$/, "");

export async function processItem(row: InputRow, signal?: AbortSignal): Promise<SpecForgeRecord> {
  const response = await fetch(`${API_BASE}/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      mfg_part_num: row.mpn?.trim(),
      part_desc: row.description?.trim(),
      e1_brand: row.brand?.trim() || null,
      unilog_brand: null,
      dib_brand: null,
      part_manuf: row.manufacturer?.trim() || null,
      force_adjudication: Boolean(row.forceAdjudication),
    }),
    signal,
  });
  if (!response.ok) {
    let detail = `Backend returned HTTP ${response.status}.`;
    try {
      const body = (await response.json()) as { detail?: string | Array<{ msg?: string }> };
      detail = typeof body.detail === "string"
        ? body.detail
        : body.detail?.map((entry) => entry.msg).filter(Boolean).join(" ") || detail;
    } catch {}
    throw new Error(detail);
  }
  const record = await response.json() as SpecForgeRecord;
  const requiredStages = [
    "clean", "brand_resolution", "classify", "extract", "normalize",
    "verify", "adjudicate", "description", "audit", "output_row",
  ] as const;
  if (!record.item_id || !record.schema_version || requiredStages.some((stage) => !record[stage])) {
    throw new Error("Backend returned an incomplete SpecForge stage trace.");
  }
  const output = record.output_row as { values?: unknown; header_order?: unknown };
  if (!output || typeof output.values !== "object" || !Array.isArray(output.header_order)) {
    throw new Error("Backend returned an invalid Delivery Format output row.");
  }
  const { recordSessionAudit } = await import("@/lib/sessionAudit");
  recordSessionAudit(record);
  return record;
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json() as { detail?: string };
    return body.detail || `Backend returned HTTP ${response.status}.`;
  } catch {
    return `Backend returned HTTP ${response.status}.`;
  }
}

export async function getEvaluation(signal?: AbortSignal): Promise<EvaluationResult> {
  const response = await fetch(`${API_BASE}/eval`, { headers: { Accept: "application/json" }, signal });
  if (!response.ok) throw new Error(await errorMessage(response));
  return response.json() as Promise<EvaluationResult>;
}

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export async function startBatch(rows: InputRow[], signal?: AbortSignal): Promise<{ status_url: string }> {
  const headers = ["Mfg_Part_Num", "Part_Desc", "E1_Brand", "Unilog_Brand", "DIB_Brand", "Part_Manuf"];
  const body = [
    headers.join(","),
    ...rows.map((row) => [row.mpn || "", row.description || "", row.brand || "", "", "", row.manufacturer || ""].map(csvCell).join(",")),
  ].join("\r\n");
  const response = await fetch(`${API_BASE}/batch`, {
    method: "POST",
    headers: { "Content-Type": "text/csv", Accept: "application/json" },
    body,
    signal,
  });
  if (!response.ok) throw new Error(await errorMessage(response));
  return response.json() as Promise<{ status_url: string }>;
}

export async function getBatchStatus(statusUrl: string, signal?: AbortSignal): Promise<BatchStatus> {
  const response = await fetch(`${API_BASE}${statusUrl}`, { headers: { Accept: "application/json" }, signal });
  if (!response.ok) throw new Error(await errorMessage(response));
  const status = await response.json() as BatchStatus;
  if (status.rows.some((row) => row.record)) {
    const { recordSessionAudit } = await import("@/lib/sessionAudit");
    status.rows.forEach((row) => { if (row.record) recordSessionAudit(row.record); });
  }
  return status;
}
