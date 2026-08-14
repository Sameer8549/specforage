"use client";
import { useState, useRef, useCallback, useId, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import {
  UploadSimple,
  ArrowRight,
  X,
  FileText,
  Warning,
  Table,
  TextAlignLeft,
} from "@phosphor-icons/react";

/* ─────────────────────────────────────────────────────────────
   Placeholder detection
   Any value matching these patterns is NOT real content.
   Rendered as visually blank (— in dim italic).
   ───────────────────────────────────────────────────────────── */
const PLACEHOLDER_PATTERNS = [
  /^--\s+/,
  /^-\s*$/,
  /^n\/?a$/i,
  /^none$/i,
  /^null$/i,
  /^unknown$/i,
  /^unbranded$/i,
  /^no brand$/i,
  /^generic$/i,
];

function isPlaceholder(value: string): boolean {
  const v = value.trim();
  if (!v) return true;
  return PLACEHOLDER_PATTERNS.some((p) => p.test(v));
}

/* ─────────────────────────────────────────────────────────────
   Field definitions
   ───────────────────────────────────────────────────────────── */
const FIELDS = [
  { key: "mpn",          label: "MPN",                    required: true,  hint: "Manufacturer Part Number" },
  { key: "description",  label: "SHORT DESCRIPTION",      required: true,  hint: "Raw catalog description text" },
  { key: "brand",        label: "BRAND",                  required: false, hint: "Brand field — placeholder values will be treated as blank" },
  { key: "manufacturer", label: "MANUFACTURER",           required: false, hint: "Manufacturer name (may be misspelled or abbreviated)" },
  { key: "category",     label: "CATEGORY",               required: false, hint: "Distributor's own category label" },
  { key: "upc",          label: "UPC / GTIN",             required: false, hint: "Optional" },
];

type RowData = Record<string, string>;

/* ─────────────────────────────────────────────────────────────
   CSV parser (browser-side, no dep)
   ───────────────────────────────────────────────────────────── */
function parseCSV(text: string): { headers: string[]; rows: RowData[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const row: RowData = {};
    headers.forEach((h, i) => { row[h] = cols[i] ?? ""; });
    return row;
  });
  return { headers, rows };
}

/* ─────────────────────────────────────────────────────────────
   Cell renderer — blanks out placeholder values
   ───────────────────────────────────────────────────────────── */
function DataCell({ value }: { value: string }) {
  const blank = isPlaceholder(value);
  return (
    <span
      style={{
        color: blank ? "var(--fg-dim)" : "var(--fg-primary)",
        fontStyle: blank ? "italic" : "normal",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
      }}
    >
      {blank ? "—" : value}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   Single-row form
   ───────────────────────────────────────────────────────────── */
function SingleRowForm({ onSubmit }: { onSubmit: (data: RowData) => void }) {
  const [values, setValues] = useState<RowData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const idPrefix = useId();

  // Listen for sample-load event from sidebar
  useEffect(() => {
    function onSample() {
      try {
        const raw = sessionStorage.getItem("sf_sample");
        if (raw) setValues(JSON.parse(raw));
      } catch {}
    }
    window.addEventListener("sf_load_sample", onSample);
    return () => window.removeEventListener("sf_load_sample", onSample);
  }, []);

  const set = (key: string, val: string) => {
    setValues((p) => ({ ...p, [key]: val }));
    if (errors[key]) setErrors((p) => { const n = { ...p }; delete n[key]; return n; });
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    FIELDS.filter((f) => f.required).forEach((f) => {
      if (!values[f.key]?.trim()) newErrors[f.key] = "REQUIRED";
    });
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {FIELDS.map((field, i) => {
          const val = values[field.key] ?? "";
          const blank = isPlaceholder(val) && val.trim() !== "";
          const hasErr = !!errors[field.key];
          const inputId = `${idPrefix}-${field.key}`;

          return (
            <div
              key={field.key}
              style={{
                borderTop: i > 0 ? "1px solid var(--border-dim)" : "none",
                padding: "20px 0",
                display: "grid",
                gridTemplateColumns: "180px 1fr",
                gap: "16px",
                alignItems: "start",
              }}
            >
              {/* Label column */}
              <div>
                <label
                  htmlFor={inputId}
                  className="text-mono-label"
                  style={{
                    display: "block",
                    marginBottom: 4,
                    color: hasErr ? "var(--accent)" : "var(--fg-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {field.label}
                  {field.required && (
                    <span style={{ color: "var(--accent)", marginLeft: 4 }}>*</span>
                  )}
                </label>
                {hasErr && (
                  <span
                    className="text-mono-label"
                    style={{ color: "var(--accent)", fontSize: 10 }}
                  >
                    {errors[field.key]}
                  </span>
                )}
              </div>

              {/* Input column */}
              <div>
                <input
                  id={inputId}
                  type="text"
                  className="input-underline"
                  value={val}
                  onChange={(e) => set(field.key, e.target.value)}
                  placeholder={field.hint}
                  aria-required={field.required}
                  aria-invalid={hasErr}
                  style={{
                    borderBottomColor: hasErr
                      ? "var(--accent)"
                      : blank
                      ? "var(--fg-dim)"
                      : undefined,
                    /* Placeholder brand values shown dim — typed value shows dim too */
                    color: blank ? "var(--fg-dim)" : "var(--fg-primary)",
                    fontStyle: blank ? "italic" : "normal",
                  }}
                />
                {/* Placeholder warning */}
                {blank && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 6,
                    }}
                  >
                    <Warning size={12} style={{ color: "var(--status-warn)" }} />
                    <span
                      className="text-mono-label"
                      style={{ color: "var(--status-warn)", fontSize: 10 }}
                    >
                      PLACEHOLDER — WILL BE TREATED AS BLANK
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          paddingTop: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <span className="text-mono-label" style={{ fontSize: 10 }}>
          * REQUIRED FIELDS
        </span>
        <button type="submit" className="btn-primary">
          RUN PIPELINE
          <ArrowRight size={15} weight="bold" />
        </button>
      </div>
    </form>
  );
}

/* ─────────────────────────────────────────────────────────────
   CSV upload zone + preview
   ───────────────────────────────────────────────────────────── */
function CSVUploader({ onSubmit }: { onSubmit: (rows: RowData[], headers: string[]) => void }) {
  const [dragging, setDragging]   = useState(false);
  const [file, setFile]           = useState<File | null>(null);
  const [preview, setPreview]     = useState<{ headers: string[]; rows: RowData[] } | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [placeholderCols, setPlaceholderCols] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const reduce   = useReducedMotion();

  const processFile = useCallback((f: File) => {
    setError(null);
    if (!f.name.endsWith(".csv")) {
      setError("FILE MUST BE .CSV");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("FILE TOO LARGE — MAX 5 MB");
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (!parsed.headers.length) {
        setError("COULD NOT PARSE CSV — CHECK FORMAT");
        return;
      }
      // Detect which columns are predominantly placeholder values
      const placeholders = new Set<string>();
      parsed.headers.forEach((h) => {
        const vals = parsed.rows.slice(0, 20).map((r) => r[h] ?? "");
        const pCount = vals.filter(isPlaceholder).length;
        if (pCount / vals.length > 0.6) placeholders.add(h);
      });
      setPlaceholderCols(placeholders);
      setPreview({ headers: parsed.headers, rows: parsed.rows.slice(0, 8) });
    };
    reader.readAsText(f);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) processFile(f);
    },
    [processFile]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  function handleSubmit() {
    if (!preview) return;
    // Re-parse full file for submission
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, rows } = parseCSV(text);
      onSubmit(rows, headers);
    };
    reader.readAsText(file!);
  }

  return (
    <div>
      {/* Drop zone */}
      {!preview && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          role="button"
          tabIndex={0}
          aria-label="Upload CSV file"
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
          style={{
            border: `1px solid ${dragging ? "var(--accent)" : "var(--border)"}`,
            backgroundColor: dragging ? "var(--bg-surface)" : "transparent",
            padding: "64px 40px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            cursor: "pointer",
            transition: "border-color 150ms ease, background-color 150ms ease",
            textAlign: "center",
          }}
        >
          <UploadSimple
            size={36}
            weight="light"
            style={{
              color: dragging ? "var(--accent)" : "var(--fg-dim)",
              transition: "color 150ms ease",
            }}
          />
          <div>
            <div
              className="text-mono-label"
              style={{
                color: dragging ? "var(--fg-primary)" : "var(--fg-secondary)",
                marginBottom: 6,
                fontSize: 12,
              }}
            >
              DROP CSV FILE HERE
            </div>
            <div className="text-mono-label" style={{ fontSize: 10 }}>
              OR CLICK TO BROWSE — MAX 5 MB
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            onChange={onInputChange}
            style={{ display: "none" }}
            aria-hidden="true"
          />
        </motion.div>
      )}

      {/* Error state */}
      {error && (
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            marginTop: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            border: "1px solid var(--accent)",
            backgroundColor: "rgba(230,25,25,0.06)",
          }}
        >
          <Warning size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
          <span
            className="text-mono-label"
            style={{ color: "var(--accent)", fontSize: 11 }}
          >
            {error}
          </span>
        </motion.div>
      )}

      {/* CSV preview */}
      <AnimatePresence>
        {preview && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* File info bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                backgroundColor: "var(--bg-surface)",
                borderBottom: "1px solid var(--border)",
                marginBottom: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FileText size={14} style={{ color: "var(--status-ok)" }} />
                <span
                  className="text-mono-data"
                  style={{ color: "var(--fg-primary)", fontSize: 12 }}
                >
                  {file?.name}
                </span>
                <span className="text-mono-label" style={{ fontSize: 10 }}>
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : ""}
                </span>
              </div>
              <button
                onClick={() => { setFile(null); setPreview(null); setError(null); }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--fg-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: 4,
                }}
                aria-label="Remove file"
              >
                <X size={14} />
              </button>
            </div>

            {/* Placeholder column notice */}
            {placeholderCols.size > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "10px 16px",
                  backgroundColor: "rgba(212,160,23,0.06)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <Warning
                  size={13}
                  weight="bold"
                  style={{ color: "var(--status-warn)", flexShrink: 0, marginTop: 1 }}
                />
                <span
                  className="text-mono-label"
                  style={{ color: "var(--status-warn)", fontSize: 10, lineHeight: 1.5 }}
                >
                  PLACEHOLDER VALUES DETECTED IN:{" "}
                  {Array.from(placeholderCols).join(", ")} — THESE WILL BE TREATED AS BLANK
                </span>
              </div>
            )}

            {/* Preview table */}
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  tableLayout: "auto",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th
                      className="text-mono-label"
                      style={{
                        padding: "8px 12px",
                        textAlign: "left",
                        width: 40,
                        color: "var(--fg-dim)",
                        fontWeight: "normal",
                        borderRight: "1px solid var(--border-dim)",
                      }}
                    >
                      #
                    </th>
                    {preview.headers.map((h) => (
                      <th
                        key={h}
                        className="text-mono-label"
                        style={{
                          padding: "8px 12px",
                          textAlign: "left",
                          fontWeight: "normal",
                          whiteSpace: "nowrap",
                          color: placeholderCols.has(h)
                            ? "var(--status-warn)"
                            : "var(--fg-secondary)",
                        }}
                      >
                        {h}
                        {placeholderCols.has(h) && (
                          <span style={{ marginLeft: 4, fontSize: 9 }}>[BLANK]</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, ri) => (
                    <tr
                      key={ri}
                      style={{ borderBottom: "1px solid var(--border-dim)" }}
                    >
                      <td
                        className="text-mono-label"
                        style={{
                          padding: "8px 12px",
                          color: "var(--mono-meta)",
                          fontSize: 10,
                          borderRight: "1px solid var(--border-dim)",
                        }}
                      >
                        {ri + 1}
                      </td>
                      {preview.headers.map((h) => (
                        <td key={h} style={{ padding: "8px 12px", maxWidth: 200 }}>
                          <DataCell value={row[h] ?? ""} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Row count note */}
              <div
                style={{
                  padding: "10px 12px",
                  borderTop: "1px solid var(--border-dim)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span className="text-mono-label" style={{ fontSize: 10 }}>
                  SHOWING FIRST 8 ROWS
                </span>
                <span className="text-mono-label" style={{ color: "var(--accent)", fontSize: 10 }}>
                  {preview.headers.length} COLUMNS DETECTED
                </span>
              </div>
            </div>

            {/* Submit row */}
            <div
              style={{
                borderTop: "1px solid var(--border)",
                paddingTop: 24,
                marginTop: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 16,
              }}
            >
              <span className="text-mono-label" style={{ fontSize: 10 }}>
                PLACEHOLDER VALUES IN BRAND / MANUFACTURER COLUMNS WILL BE RESOLVED TO BLANK
              </span>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSubmit}
              >
                PROCESS BATCH
                <ArrowRight size={15} weight="bold" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main Input Page
   ───────────────────────────────────────────────────────────── */
type Mode = "single" | "csv";

export default function InputPage() {
  const [mode, setMode] = useState<Mode>("single");
  const router          = useRouter();
  const reduce          = useReducedMotion();
  const ease            = [0.16, 1, 0.3, 1] as const;

  function handleSingleSubmit(data: RowData) {
    // Store in sessionStorage and navigate to pipeline view
    sessionStorage.setItem("sf_row", JSON.stringify(data));
    router.push("/pipeline/live");
  }

  function handleCSVSubmit(rows: RowData[], headers: string[]) {
    sessionStorage.setItem("sf_batch", JSON.stringify({ rows, headers }));
    router.push("/batch/live");
  }

  return (
    <>
      {/* CRT noise */}
      <div className="noise-overlay" aria-hidden="true" />

      <main style={{ paddingTop: 56 }}>
        <div
          style={{
            maxWidth: 1440,
            margin: "0 auto",
            borderLeft: "1px solid var(--border)",
            borderRight: "1px solid var(--border)",
            minHeight: "calc(100dvh - 56px)",
          }}
        >
          {/* ── Page header ── */}
          <div
            style={{
              borderBottom: "1px solid var(--border)",
              padding: "40px 64px 36px",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 24,
            }}
          >
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease }}
            >
              <div
                className="text-mono-label"
                style={{ marginBottom: 10, color: "var(--accent)" }}
              >
                [ PIPELINE / INPUT ]
              </div>
              <h1
                className="text-display"
                style={{ fontSize: "clamp(2rem, 3.5vw, 3.2rem)" }}
              >
                CATALOG INPUT.
              </h1>
            </motion.div>

            {/* Mode toggle */}
            <motion.div
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              style={{ display: "flex", gap: 0 }}
              role="group"
              aria-label="Input mode"
            >
              {(["single", "csv"] as Mode[]).map((m) => {
                const active = mode === m;
                return (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    aria-pressed={active}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 20px",
                      background: active ? "var(--accent)" : "transparent",
                      color: active ? "#fff" : "var(--fg-secondary)",
                      border: "1px solid",
                      borderColor: active ? "var(--accent)" : "var(--border)",
                      borderRight: m === "single" ? "none" : undefined,
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      transition: "background 150ms ease, color 150ms ease",
                    }}
                  >
                    {m === "single" ? (
                      <TextAlignLeft size={13} />
                    ) : (
                      <Table size={13} />
                    )}
                    {m === "single" ? "SINGLE ROW" : "CSV UPLOAD"}
                  </button>
                );
              })}
            </motion.div>
          </div>

          {/* ── Content area ── */}
          <div
            className="two-col"
            style={{
              display: "grid",
              gridTemplateColumns: mode === "single" ? "1fr 380px" : "1fr",
            }}
          >
            {/* Main form / upload area */}
            <div
              className="section-pad"
              style={{
                padding: "48px 64px",
                borderRight: mode === "single" ? "1px solid var(--border)" : "none",
              }}
            >
              <AnimatePresence mode="wait">
                {mode === "single" ? (
                  <motion.div
                    key="single"
                    initial={reduce ? false : { opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.3, ease }}
                  >
                    <SingleRowForm onSubmit={handleSingleSubmit} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="csv"
                    initial={reduce ? false : { opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.3, ease }}
                  >
                    <CSVUploader onSubmit={handleCSVSubmit} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sidebar — single mode only */}
            {mode === "single" && (
              <motion.aside
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                style={{ padding: "48px 32px" }}
              >
                {/* Field guide */}
                <div className="text-mono-label" style={{ marginBottom: 20 }}>
                  FIELD GUIDE
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {FIELDS.map((f, i) => (
                    <div
                      key={f.key}
                      style={{
                        borderTop: i > 0 ? "1px solid var(--border-dim)" : "none",
                        padding: "12px 0",
                      }}
                    >
                      <div
                        className="text-mono-data"
                        style={{
                          color: "var(--fg-secondary)",
                          fontSize: 11,
                          marginBottom: 3,
                        }}
                      >
                        {f.label}
                        {f.required && (
                          <span style={{ color: "var(--accent)", marginLeft: 4 }}>*</span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--fg-dim)",
                          lineHeight: 1.5,
                        }}
                      >
                        {f.hint}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Placeholder note */}
                <div
                  style={{
                    marginTop: 32,
                    padding: "16px",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--bg-surface)",
                  }}
                >
                  <div
                    className="text-mono-label"
                    style={{ marginBottom: 10, color: "var(--status-warn)" }}
                  >
                    [ PLACEHOLDER HANDLING ]
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--fg-secondary)",
                      lineHeight: 1.6,
                    }}
                  >
                    Values like{" "}
                    <code
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--fg-dim)",
                        fontSize: 11,
                      }}
                    >
                      "-- No Unilog Brand --"
                    </code>
                    ,{" "}
                    <code
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--fg-dim)",
                        fontSize: 11,
                      }}
                    >
                      "-- Unbranded --"
                    </code>{" "}
                    are treated as blank and flagged. They will not be carried into the output
                    record.
                  </p>
                </div>

                {/* Sample input */}
                <div style={{ marginTop: 32 }}>
                  <div className="text-mono-label" style={{ marginBottom: 12 }}>
                    SAMPLE INPUT
                  </div>
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={() => {
                      const sample: RowData = {
                        mpn:          "FGID2466QF4A",
                        description:  "24 in Built-In Dishwasher w/ EvenDry 47dB SS",
                        brand:        "-- No Unilog Brand --",
                        manufacturer: "Frigidare",
                        category:     "Major Appliances",
                        upc:          "",
                      };
                      // dispatch to form — simulate via sessionStorage trick
                      sessionStorage.setItem("sf_sample", JSON.stringify(sample));
                      window.dispatchEvent(new Event("sf_load_sample"));
                    }}
                  >
                    LOAD SAMPLE ROW
                  </button>
                </div>
              </motion.aside>
            )}
          </div>

          {/* CSV format reference */}
          {mode === "csv" && (
            <motion.div
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              style={{
                borderTop: "1px solid var(--border)",
                padding: "32px 64px",
                display: "flex",
                alignItems: "flex-start",
                gap: 48,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div className="text-mono-label" style={{ marginBottom: 12 }}>
                  EXPECTED COLUMNS
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["MPN", "SHORT_DESCRIPTION", "BRAND", "MANUFACTURER", "CATEGORY", "UPC"].map(
                    (c) => (
                      <span key={c} className="badge badge-dim">
                        {c}
                      </span>
                    )
                  )}
                </div>
              </div>
              <div>
                <div className="text-mono-label" style={{ marginBottom: 12 }}>
                  PLACEHOLDER VALUES DETECTED AND BLANKED
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[
                    "-- Unbranded --",
                    "-- No Unilog Brand --",
                    "N/A",
                    "None",
                    "Unknown",
                  ].map((p) => (
                    <span
                      key={p}
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--fg-dim)",
                        padding: "2px 6px",
                        border: "1px solid var(--border-dim)",
                        fontStyle: "italic",
                      }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </>
  );
}
