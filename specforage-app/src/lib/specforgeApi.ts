export type StageObject = Record<string, unknown>;

export interface SpecForgeRecord {
  item_id: string;
  schema_version: string;
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
}

const API_BASE = (process.env.NEXT_PUBLIC_SPECFORGE_API_URL ?? "http://127.0.0.1:8000")
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
  return response.json() as Promise<SpecForgeRecord>;
}
