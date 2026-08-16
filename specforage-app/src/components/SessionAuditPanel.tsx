"use client";

import { useCallback, useEffect, useState } from "react";
import { DownloadSimple } from "@phosphor-icons/react";
import type { SpecForgeRecord } from "@/lib/specforgeApi";
import { downloadRecords, getSessionAuditRecords } from "@/lib/sessionAudit";

export default function SessionAuditPanel() {
  const [records, setRecords] = useState<SpecForgeRecord[]>([]);
  const refresh = useCallback(() => setRecords(getSessionAuditRecords()), []);
  useEffect(() => {
    const initialRefresh = window.setTimeout(refresh, 0);
    window.addEventListener("specforge:audit-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => { window.clearTimeout(initialRefresh); window.removeEventListener("specforge:audit-updated", refresh); window.removeEventListener("storage", refresh); };
  }, [refresh]);
  return <div className="session-audit-panel">
    <div><strong>{records.length} complete trace{records.length === 1 ? "" : "s"}</strong><p>Browser-session scope only. JSON preserves every stage; CSV is a compact index. SpecForge does not persist catalog inputs on the frontend server.</p></div>
    <div className="session-audit-actions"><button className="btn-ghost" disabled={!records.length} onClick={() => downloadRecords(records, "json")}><DownloadSimple size={15} /> Full JSON</button><button className="btn-ghost" disabled={!records.length} onClick={() => downloadRecords(records, "csv")}><DownloadSimple size={15} /> Summary CSV</button></div>
  </div>;
}
