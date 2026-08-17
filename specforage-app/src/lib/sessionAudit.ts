import type { SpecForgeRecord } from "@/lib/specforgeApi";

const STORAGE_KEY = "sf_audit_records_v1";
const MAX_RECORDS = 100;

export function getSessionAuditRecords(): SpecForgeRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function recordSessionAudit(record: SpecForgeRecord): void {
  if (typeof window === "undefined") return;
  const records = getSessionAuditRecords().filter((entry) => entry.item_id !== record.item_id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([record, ...records].slice(0, MAX_RECORDS)));
  window.dispatchEvent(new Event("specforge:audit-updated"));
}

export function adjudicationInvoked(record: SpecForgeRecord): boolean {
  const stage = record.adjudicate as Record<string, unknown> | null | undefined;
  if (!stage) return false;
  if (typeof stage.llm_invoked === "boolean") return stage.llm_invoked;
  return Boolean(stage.needs_human_review || (Array.isArray(stage.rejected_values) && stage.rejected_values.length) || (Array.isArray(stage.reasoning) && stage.reasoning.length));
}

export function downloadRecords(records: SpecForgeRecord[], format: "json" | "csv"): void {
  const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const content = format === "json" ? JSON.stringify(records, null, 2) : [
    ["item_id", "created_at", "mpn", "manufacturer", "brand", "unspsc", "classification_confidence", "cache_hit", "adjudication_invoked", "routed_to_review"].join(","),
    ...records.map((record) => {
      const input = record.input as Record<string, unknown>;
      const resolution = record.brand_resolution as Record<string, unknown>;
      const manufacturer = resolution?.manufacturer as Record<string, unknown> | undefined;
      const brand = resolution?.brand as Record<string, unknown> | undefined;
      const classify = record.classify as Record<string, unknown>;
      const audit = record.audit as Record<string, unknown>;
      return [record.item_id, record.created_at, input?.mfg_part_num, manufacturer?.canonical_name, brand?.canonical_name, classify?.unspsc_code, classify?.confidence, resolution?.mpn_lookup_cache_hit, adjudicationInvoked(record), audit?.routed_to_review].map(csvCell).join(",");
    }),
  ].join("\r\n");
  const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `specforge-session-audit.${format}`;
  anchor.click();
  URL.revokeObjectURL(url);
}
