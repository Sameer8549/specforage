"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import Link from "next/link";
import {
  CheckCircle, ArrowRight, Warning, MagnifyingGlass,
  ArrowsClockwise, Gavel, FileText, ClipboardText,
  Funnel, Scales, ListChecks, ArrowSquareOut,
} from "@phosphor-icons/react";

/* ─────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────── */
type StageStatus = "queued" | "active" | "done" | "error";

interface Stage {
  id: string;
  label: string;
  shortLabel: string;
  duration: number; // ms
  icon: React.ReactNode;
}

/* ─────────────────────────────────────────────────────────────
   Stage definitions
   ───────────────────────────────────────────────────────────── */
const STAGES: Stage[] = [
  { id: "01", label: "CLEAN",               shortLabel: "Clean",             duration: 1600, icon: <Funnel size={13} /> },
  { id: "02", label: "RESOLVE MFR / BRAND", shortLabel: "Resolve Mfr/Brand", duration: 2800, icon: <ArrowsClockwise size={13} /> },
  { id: "03", label: "CLASSIFY",            shortLabel: "Classify",           duration: 2400, icon: <MagnifyingGlass size={13} /> },
  { id: "04", label: "EXTRACT",             shortLabel: "Extract",            duration: 3600, icon: <FileText size={13} /> },
  { id: "05", label: "NORMALIZE",           shortLabel: "Normalize",          duration: 1800, icon: <Scales size={13} /> },
  { id: "06", label: "VERIFY",              shortLabel: "Verify",             duration: 2200, icon: <ListChecks size={13} /> },
  { id: "07", label: "ADJUDICATE",          shortLabel: "Adjudicate",         duration: 2000, icon: <Gavel size={13} /> },
  { id: "08", label: "BUILD DESCRIPTION",   shortLabel: "Build Description",  duration: 2600, icon: <ClipboardText size={13} /> },
  { id: "09", label: "AUDIT",               shortLabel: "Audit",              duration: 1400, icon: <ListChecks size={13} /> },
  { id: "10", label: "MAP OUTPUT",          shortLabel: "Map Output",         duration: 1200, icon: <ArrowSquareOut size={13} /> },
];

/* ─────────────────────────────────────────────────────────────
   Stage content panels — one per stage
   ───────────────────────────────────────────────────────────── */

/* shared row component */
function Row({ label, value, badge, badgeColor, dim }: {
  label: string; value: string; badge?: string;
  badgeColor?: string; dim?: boolean;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "160px 1fr auto", borderTop: "1px solid var(--border-dim)", gap: 0 }}>
      <div className="text-mono-label" style={{ padding: "9px 12px", fontSize: 10, borderRight: "1px solid var(--border-dim)" }}>
        {label}
      </div>
      <div className="text-mono-data" style={{ padding: "9px 12px", fontSize: 12, color: dim ? "var(--fg-dim)" : "var(--fg-primary)", fontStyle: dim ? "italic" : "normal" }}>
        {dim ? "—" : value}
      </div>
      {badge && (
        <div style={{ padding: "9px 12px", display: "flex", alignItems: "center" }}>
          <span className="badge" style={{ color: badgeColor || "var(--fg-secondary)", borderColor: badgeColor || "var(--border)", fontSize: 9 }}>
            {badge}
          </span>
        </div>
      )}
    </div>
  );
}

function SectionHead({ label }: { label: string }) {
  return (
    <div className="text-mono-label" style={{ padding: "10px 12px", backgroundColor: "var(--bg-elevated)", borderBottom: "1px solid var(--border-dim)", color: "var(--accent)", fontSize: 10 }}>
      {label}
    </div>
  );
}

/* Stage 01 — Clean */
function Stage01Content() {
  return (
    <div style={{ border: "1px solid var(--border)" }}>
      <SectionHead label="[ CLEAN / INPUT FIELDS ]" />
      <Row label="MPN"          value="FGID2466QF4A" badge="RETAINED" badgeColor="var(--status-ok)" />
      <Row label="DESCRIPTION"  value="24 in Built-In Dishwasher w/ EvenDry 47dB" badge="RETAINED" badgeColor="var(--status-ok)" />
      <Row label="BRAND"        value="" badge="STRIPPED" badgeColor="var(--status-warn)" dim />
      <Row label="MANUFACTURER" value="Frigidare" badge="RETAINED" badgeColor="var(--status-ok)" />
      <Row label="CATEGORY"     value="Major Appliances" badge="RETAINED" badgeColor="var(--status-ok)" />
      <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border-dim)", display: "flex", alignItems: "center", gap: 8 }}>
        <Warning size={13} style={{ color: "var(--status-warn)" }} />
        <span className="text-mono-label" style={{ fontSize: 10, color: "var(--status-warn)" }}>
          1 PLACEHOLDER VALUE STRIPPED — BRAND FIELD TREATED AS NULL
        </span>
      </div>
    </div>
  );
}

/* Stage 02 — Resolve Mfr/Brand */
function Stage02Content() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Resolution result */}
      <div style={{ border: "1px solid var(--border)" }}>
        <SectionHead label="[ RESOLVE / MANUFACTURER ]" />
        <Row label="INPUT"       value='Frigidare' badge="RAW" badgeColor="var(--status-warn)" />
        <Row label="CANONICAL"   value="Frigidaire Company" badge="MATCHED" badgeColor="var(--status-ok)" />
        <Row label="CONFIDENCE"  value="0.94" badge="HIGH" badgeColor="var(--status-ok)" />
        <Row label="METHOD"      value="FUZZY SIMILARITY — LEVENSHTEIN DISTANCE 2" />
        <Row label="PARENT"      value="Electrolux AB (publ)" />
      </div>

      {/* Rejected variants */}
      <div style={{ border: "1px solid var(--border)" }}>
        <SectionHead label="[ REJECTED VARIANTS ]" />
        {[
          { v: "Frigidaire Corp",       r: "NOT IN APPROVED REGISTRY" },
          { v: "Frigidare Inc",         r: "MISSPELLING — NOT CANONICAL" },
          { v: "Frigidaire Electronics",r: "DIVISION — NOT MANUFACTURER" },
        ].map((item) => (
          <div key={item.v} style={{ display: "grid", gridTemplateColumns: "1fr auto", borderTop: "1px solid var(--border-dim)", padding: "9px 12px", gap: 12 }}>
            <span className="text-mono-data" style={{ color: "var(--fg-dim)", fontSize: 12, textDecoration: "line-through" }}>{item.v}</span>
            <span className="text-mono-label" style={{ fontSize: 9, color: "var(--fg-dim)", whiteSpace: "nowrap" }}>{item.r}</span>
          </div>
        ))}
      </div>

      {/* Brand resolution */}
      <div style={{ border: "1px solid var(--border)" }}>
        <SectionHead label="[ RESOLVE / BRAND ]" />
        <Row label="INPUT"     value="(NULL — PLACEHOLDER STRIPPED)" dim />
        <Row label="INFERRED"  value="Frigidaire" badge="FROM MANUFACTURER" badgeColor="var(--status-warn)" />
        <Row label="CONFIDENCE" value="0.87" badge="INFERRED" badgeColor="var(--status-warn)" />
        <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border-dim)" }}>
          <span className="text-mono-label" style={{ fontSize: 10, color: "var(--fg-secondary)" }}>
            NOTE: NO DIRECT BRAND INPUT. BRAND INFERRED FROM CANONICAL MANUFACTURER NAME. FLAGGED FOR REVIEW IF MANUFACTURER OPERATES MULTIPLE BRANDS.
          </span>
        </div>
      </div>
    </div>
  );
}

/* Stage 03 — Classify */
function Stage03Content() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ border: "1px solid var(--border)" }}>
        <SectionHead label="[ CLASSIFY / UNSPSC — PUBLIC TAXONOMY v22.0501 ]" />
        <Row label="UNSPSC CODE"  value="40181501" badge="MATCHED" badgeColor="var(--status-ok)" />
        <Row label="SEGMENT"      value="40 — Distribution and Conditioning Systems, Components and Accessories" />
        <Row label="FAMILY"       value="4018 — Plumbing fixtures" />
        <Row label="CLASS"        value="401815 — Dishwashers" />
        <Row label="COMMODITY"    value="40181501 — Household dishwashers" />
        <Row label="CLASSPATH"    value="Appliances → Dishwashers → Household Dishwashers" />
        <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border-dim)", display: "flex", alignItems: "center", gap: 8 }}>
          <span className="text-mono-label" style={{ fontSize: 10, color: "var(--status-ok)" }}>
            CLASSIFICATION ANCHORED TO PUBLIC UNSPSC TAXONOMY — CATEGORY-AGNOSTIC, NO CUSTOM CODES
          </span>
        </div>
      </div>

      {/* Expected attributes for this commodity */}
      <div style={{ border: "1px solid var(--border)" }}>
        <SectionHead label="[ EXPECTED ATTRIBUTES FOR 40181501 ]" />
        {[
          "FINISH", "INSTALLATION TYPE", "NOISE LEVEL (dB)", "CAPACITY (PLACE SETTINGS)",
          "WIDTH (IN)", "INTERIOR MATERIAL", "CONTROLS TYPE", "CYCLE COUNT",
          "ENERGY STAR CERTIFIED", "HEATED DRY"
        ].map((attr, i) => (
          <div key={attr} style={{ display: "grid", gridTemplateColumns: "24px 1fr", borderTop: i > 0 ? "1px solid var(--border-dim)" : "none", padding: "8px 12px", gap: 12 }}>
            <span className="text-mono-label" style={{ fontSize: 9, color: "var(--mono-meta)" }}>{String(i + 1).padStart(2, "0")}</span>
            <span className="text-mono-data" style={{ fontSize: 11 }}>{attr}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Stage 04 — Extract */
function Stage04Content() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Source query log */}
      <div style={{ border: "1px solid var(--border)" }}>
        <SectionHead label="[ EXTRACT / WEB RETRIEVAL — MANUFACTURER DOMAIN ONLY ]" />
        <div style={{ padding: "12px", borderTop: "1px solid var(--border-dim)", backgroundColor: "var(--bg-elevated)" }}>
          <div className="text-mono-label" style={{ fontSize: 10, marginBottom: 8 }}>QUERY LOG</div>
          {[
            { query: 'site:frigidaire.com "FGID2466QF4A"', status: "200 OK", results: 1 },
            { query: 'site:frigidaire.com "Built-In Dishwasher" "47 dB"', status: "200 OK", results: 3 },
          ].map((q, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: i === 0 ? 8 : 0 }}>
              <span className="text-mono-label" style={{ color: "var(--status-ok)", fontSize: 10, flexShrink: 0 }}>{q.status}</span>
              <code style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-secondary)", wordBreak: "break-all" }}>{q.query}</code>
              <span className="text-mono-label" style={{ fontSize: 9, color: "var(--mono-meta)", flexShrink: 0 }}>{q.results} RESULT{q.results !== 1 ? "S" : ""}</span>
            </div>
          ))}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border-dim)" }}>
            <span className="text-mono-label" style={{ fontSize: 10, color: "var(--status-warn)" }}>
              NEVER QUERIES: marketplaces, distributor sites, aggregators. MANUFACTURER DOMAIN ONLY.
            </span>
          </div>
        </div>
      </div>

      {/* Extracted values with source */}
      <div style={{ border: "1px solid var(--border)" }}>
        <SectionHead label="[ EXTRACTED ATTRIBUTES ]" />
        {[
          { attr: "NOISE LEVEL",       value: '47 dB',            source: "DESCRIPTION",           confidence: "0.99" },
          { attr: "WIDTH",             value: '24 in',            source: "DESCRIPTION",           confidence: "0.97" },
          { attr: "INSTALLATION TYPE", value: 'Built-In',         source: "DESCRIPTION",           confidence: "0.98" },
          { attr: "FINISH",            value: 'Stainless Steel',  source: "site:frigidaire.com",   confidence: "0.96" },
          { attr: "CAPACITY",          value: '14 Place Settings', source: "site:frigidaire.com",  confidence: "0.94" },
          { attr: "CONTROLS TYPE",     value: 'Front Controls',   source: "site:frigidaire.com",   confidence: "0.92" },
          { attr: "HEATED DRY",        value: 'EvenDry™',         source: "DESCRIPTION",           confidence: "0.95" },
        ].map((item) => (
          <div key={item.attr} style={{ display: "grid", gridTemplateColumns: "140px 1fr 200px auto", borderTop: "1px solid var(--border-dim)" }}>
            <div className="text-mono-label" style={{ padding: "9px 12px", fontSize: 10, borderRight: "1px solid var(--border-dim)" }}>{item.attr}</div>
            <div className="text-mono-data" style={{ padding: "9px 12px", fontSize: 12 }}>{item.value}</div>
            <div style={{ padding: "9px 12px", borderLeft: "1px solid var(--border-dim)" }}>
              <span className="text-mono-label" style={{ fontSize: 9, color: item.source.startsWith("site:") ? "var(--status-ok)" : "var(--fg-secondary)" }}>
                {item.source.startsWith("site:") ? `[ MFR SOURCE ] ${item.source}` : `[ DESCRIPTION ]`}
              </span>
            </div>
            <div style={{ padding: "9px 12px", borderLeft: "1px solid var(--border-dim)" }}>
              <span className="text-mono-label" style={{ fontSize: 9, color: parseFloat(item.confidence) >= 0.95 ? "var(--status-ok)" : "var(--status-warn)" }}>
                {item.confidence}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Stage 05 — Normalize */
function Stage05Content() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ border: "1px solid var(--border)" }}>
        <SectionHead label="[ NORMALIZE / UOM STANDARDIZATION ]" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", borderTop: "1px solid var(--border-dim)" }}>
          <div className="text-mono-label" style={{ padding: "8px 12px", fontSize: 10 }}>RAW FORM</div>
          <div className="text-mono-label" style={{ padding: "8px 12px", fontSize: 10, textAlign: "center", borderLeft: "1px solid var(--border-dim)", borderRight: "1px solid var(--border-dim)" }}>→</div>
          <div className="text-mono-label" style={{ padding: "8px 12px", fontSize: 10 }}>APPROVED FORM</div>
        </div>
        {[
          { raw: '"47dB"',                            out: '"47 dB"',           rule: "SPACE BEFORE UNIT" },
          { raw: '"24 in" / "24 IN." / "24 inch"',   out: '"24 in"',           rule: "CANONICAL ABBREVIATION" },
          { raw: '"inches" / "IN." / "inch"',         out: '"in"',              rule: "LOWERCASE ABBREVIATION" },
          { raw: '"14 PS" / "14 place settings"',     out: '"14 Place Settings"',rule: "TITLECASE + FULL FORM" },
        ].map((item, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", borderTop: "1px solid var(--border-dim)" }}>
            <code style={{ fontFamily: "var(--font-mono)", padding: "9px 12px", fontSize: 11, color: "var(--fg-secondary)" }}>{item.raw}</code>
            <div style={{ padding: "9px 12px", borderLeft: "1px solid var(--border-dim)", borderRight: "1px solid var(--border-dim)", display: "flex", alignItems: "center" }}>
              <ArrowRight size={11} style={{ color: "var(--accent)" }} />
            </div>
            <div style={{ padding: "9px 12px" }}>
              <code style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--status-ok)" }}>{item.out}</code>
              <div className="text-mono-label" style={{ fontSize: 9, color: "var(--mono-meta)", marginTop: 2 }}>{item.rule}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ border: "1px solid var(--border)" }}>
        <SectionHead label="[ NORMALIZE / DECIMAL → FRACTION ]" />
        {[
          { raw: "50.25 in",  out: '50-1/4 in',  note: "0.25 = 1/4" },
          { raw: "24.0 in",   out: '24 in',       note: "INTEGER — NO FRACTION" },
          { raw: "13.375 in", out: '13-3/8 in',   note: "0.375 = 3/8" },
        ].map((item, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto", borderTop: "1px solid var(--border-dim)" }}>
            <code style={{ fontFamily: "var(--font-mono)", padding: "9px 12px", fontSize: 11, color: "var(--fg-secondary)" }}>{item.raw}</code>
            <div style={{ padding: "9px 12px", borderLeft: "1px solid var(--border-dim)", borderRight: "1px solid var(--border-dim)", display: "flex", alignItems: "center" }}>
              <ArrowRight size={11} style={{ color: "var(--accent)" }} />
            </div>
            <code style={{ fontFamily: "var(--font-mono)", padding: "9px 12px", fontSize: 11, color: "var(--status-ok)" }}>{item.out}</code>
            <div className="text-mono-label" style={{ padding: "9px 12px", fontSize: 9, color: "var(--mono-meta)", borderLeft: "1px solid var(--border-dim)" }}>{item.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Stage 06 — Verify */
function Stage06Content() {
  return (
    <div style={{ border: "1px solid var(--border)" }}>
      <SectionHead label="[ VERIFY / SOURCE ENTAILMENT CHECK ]" />
      {[
        { field: "NOISE LEVEL",       value: "47 dB",           verdict: "ENTAILED",    source: "DESCRIPTION TEXT: '47dB'",              conf: "0.99" },
        { field: "WIDTH",             value: "24 in",           verdict: "ENTAILED",    source: "DESCRIPTION TEXT: '24 in'",             conf: "0.97" },
        { field: "INSTALLATION TYPE", value: "Built-In",        verdict: "ENTAILED",    source: "DESCRIPTION TEXT: 'Built-In'",          conf: "0.98" },
        { field: "FINISH",            value: "Stainless Steel", verdict: "ENTAILED",    source: "site:frigidaire.com PRODUCT SPEC PAGE",  conf: "0.96" },
        { field: "CAPACITY",          value: "14 Place Settings",verdict: "ENTAILED",   source: "site:frigidaire.com SPEC TABLE",         conf: "0.94" },
        { field: "CONTROLS TYPE",     value: "Front Controls",  verdict: "ENTAILED",    source: "site:frigidaire.com IMAGE + TEXT",       conf: "0.92" },
        { field: "ENERGY STAR",       value: "(NOT FOUND)",     verdict: "UNVERIFIED",  source: "NOT IN DESCRIPTION OR MFR SOURCE",       conf: "—" },
      ].map((item) => {
        const color = item.verdict === "ENTAILED" ? "var(--status-ok)" : item.verdict === "UNVERIFIED" ? "var(--status-warn)" : "var(--accent)";
        return (
          <div key={item.field} style={{ display: "grid", gridTemplateColumns: "140px 1fr 160px 60px", borderTop: "1px solid var(--border-dim)" }}>
            <div className="text-mono-label" style={{ padding: "9px 12px", fontSize: 10, borderRight: "1px solid var(--border-dim)" }}>{item.field}</div>
            <div style={{ padding: "9px 12px" }}>
              <div className="text-mono-data" style={{ fontSize: 12, marginBottom: 2 }}>{item.value}</div>
              <div className="text-mono-label" style={{ fontSize: 9, color: "var(--mono-meta)" }}>{item.source}</div>
            </div>
            <div style={{ padding: "9px 12px", borderLeft: "1px solid var(--border-dim)", display: "flex", alignItems: "center" }}>
              <span className="badge" style={{ color, borderColor: color, fontSize: 9 }}>{item.verdict}</span>
            </div>
            <div className="text-mono-label" style={{ padding: "9px 12px", borderLeft: "1px solid var(--border-dim)", fontSize: 10, color: parseFloat(item.conf) >= 0.95 ? "var(--status-ok)" : "var(--fg-dim)" }}>
              {item.conf}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* Stage 07 — Adjudicate */
function Stage07Content() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ border: "1px solid var(--border)" }}>
        <SectionHead label="[ ADJUDICATE / CONFLICT DETECTED ]" />
        <div style={{ padding: "16px 12px", borderTop: "1px solid var(--border-dim)", display: "flex", alignItems: "center", gap: 8 }}>
          <Warning size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
          <span className="text-mono-label" style={{ color: "var(--accent)", fontSize: 11 }}>
            CONFLICT — NOISE LEVEL ROUNDING
          </span>
        </div>
        <Row label="FIELD"          value="NOISE LEVEL (dB)" />
        <Row label="EXTRACTED VALUE" value="47 dB" badge="FROM DESCRIPTION" badgeColor="var(--status-warn)" />
        <Row label="EXPECTED RANGE"  value="44 – 50 dB  (UNSPSC 40181501 CLASS RANGE)" />
        <Row label="CONFLICT TYPE"   value="VALUE WITHIN RANGE — NO CONTRADICTION" badge="RESOLVED" badgeColor="var(--status-ok)" />
      </div>

      <div style={{ border: "1px solid var(--border)" }}>
        <SectionHead label="[ ADJUDICATION LOG ]" />
        <div style={{ padding: "14px 12px", borderTop: "1px solid var(--border-dim)", display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { step: "01", note: "Extracted '47 dB' from description text '47dB' — high confidence (0.99)" },
            { step: "02", note: "Cross-referenced against UNSPSC 40181501 expected noise-level range: 44–50 dB" },
            { step: "03", note: "47 dB falls within expected range — no contradiction with taxonomy expectations" },
            { step: "04", note: "No conflict with manufacturer source (site:frigidaire.com confirms 47 dB rating)" },
            { step: "05", note: "DECISION: ACCEPT '47 dB' — consistent across all sources. No adjudication override needed." },
          ].map((item) => (
            <div key={item.step} style={{ display: "flex", gap: 10 }}>
              <span className="text-mono-label" style={{ fontSize: 10, color: "var(--mono-meta)", flexShrink: 0, paddingTop: 1 }}>{item.step}</span>
              <span style={{ fontSize: 12, color: "var(--fg-secondary)", lineHeight: 1.5 }}>{item.note}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ border: "1px solid var(--border)" }}>
        <SectionHead label="[ SECOND CONFLICT — BRAND INFERRED ]" />
        <Row label="FIELD"          value="BRAND" />
        <Row label="EXTRACTED VALUE" value="(NULL — PLACEHOLDER STRIPPED)" dim />
        <Row label="INFERRED VALUE"  value="Frigidaire" badge="INFERRED FROM MFR" badgeColor="var(--status-warn)" />
        <Row label="DECISION"        value="ACCEPT INFERRED — FLAG FOR HUMAN REVIEW" badge="FLAGGED" badgeColor="var(--status-warn)" />
        <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border-dim)" }}>
          <span className="text-mono-label" style={{ fontSize: 10, color: "var(--fg-secondary)" }}>
            REASONING: Single-brand manufacturer. Frigidaire Company → Frigidaire brand inference is reliable. However no explicit brand source exists — flagged for human confirmation.
          </span>
        </div>
      </div>
    </div>
  );
}

/* Stage 08 — Build Description */
function Stage08Content() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ border: "1px solid var(--border)" }}>
        <SectionHead label="[ BUILD DESCRIPTION / FORMULA-BASED — NOT FREE TEXT ]" />
        <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border-dim)" }}>
          <div className="text-mono-label" style={{ fontSize: 10, marginBottom: 6 }}>FORMULA</div>
          <code style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-secondary)", lineHeight: 1.7 }}>
            {`[Brand] [Width] [InstallType] [CommodityName] [KeySpec1] [KeySpec2]`}
          </code>
        </div>
      </div>
      {[
        { variant: "MOBILE",    limit: 50,  value: "Frigidaire 24 in Built-In Dishwasher 47 dB" },
        { variant: "INVOICE",   limit: 60,  value: "Frigidaire 24 in Built-In Dishwasher EvenDry 47 dB SS" },
        { variant: "SHORT",     limit: 80,  value: "Frigidaire 24 in Built-In Dishwasher EvenDry 47 dB Stainless Steel" },
        { variant: "LONG",      limit: 200, value: "Frigidaire 24 in Built-In Dishwasher with EvenDry Drying System, 47 dB, Stainless Steel Interior, 14 Place Settings, Front Controls" },
        { variant: "RETAIL",    limit: 150, value: "Frigidaire 24 in Stainless Steel Built-In Dishwasher — 47 dB EvenDry, 14 Place Settings, Front Controls" },
        { variant: "MARKETING", limit: 500, value: "Experience quiet, efficient dishwashing with the Frigidaire FGID2466QF4A. Built-In installation, 24-inch width, EvenDry™ technology, and a 47 dB operation level make it a standout choice for modern kitchens." },
      ].map((item) => {
        const len = item.value.length;
        const pct = (len / item.limit) * 100;
        const over = len > item.limit;
        return (
          <div key={item.variant} style={{ border: "1px solid var(--border)" }}>
            <div style={{ padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "var(--bg-elevated)", borderBottom: "1px solid var(--border-dim)" }}>
              <span className="text-mono-label" style={{ fontSize: 10 }}>{item.variant}</span>
              <span className="text-mono-label" style={{ fontSize: 10, color: over ? "var(--accent)" : "var(--fg-secondary)" }}>
                {len}/{item.limit} CHARS {over ? "⚠ OVER LIMIT" : ""}
              </span>
            </div>
            <div style={{ padding: "12px" }}>
              <p style={{ fontSize: 13, color: "var(--fg-primary)", lineHeight: 1.5, marginBottom: 10 }}>{item.value}</p>
              {/* Character limit bar */}
              <div style={{ height: 2, backgroundColor: "var(--border)", position: "relative" }}>
                <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min(pct, 100)}%`, backgroundColor: over ? "var(--accent)" : "var(--status-ok)", transition: "width 400ms ease" }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* Stage 09 — Audit */
function Stage09Content() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ border: "1px solid var(--border)" }}>
        <SectionHead label="[ AUDIT / COVERAGE & CONFIDENCE ]" />
        <Row label="FIELDS REQUIRED"   value="10" />
        <Row label="FIELDS FILLED"     value="9 / 10" badge="90%" badgeColor="var(--status-ok)" />
        <Row label="FIELDS MISSING"    value="ENERGY STAR CERTIFIED" badge="UNVERIFIED" badgeColor="var(--status-warn)" />
        <Row label="AVG CONFIDENCE"    value="0.95" badge="HIGH" badgeColor="var(--status-ok)" />
        <Row label="HUMAN REVIEW FLAGS" value="2 FIELDS" badge="REVIEW" badgeColor="var(--status-warn)" />
      </div>
      <div style={{ border: "1px solid var(--border)" }}>
        <SectionHead label="[ AUDIT / HUMAN-REVIEW FLAGS ]" />
        {[
          { field: "BRAND",         reason: "INFERRED FROM MANUFACTURER — NO EXPLICIT SOURCE", flag: "CONFIRM BRAND" },
          { field: "ENERGY STAR",   reason: "NOT FOUND IN DESCRIPTION OR MANUFACTURER SOURCE",  flag: "MANUAL LOOKUP" },
        ].map((item, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "140px 1fr auto", borderTop: "1px solid var(--border-dim)" }}>
            <div className="text-mono-label" style={{ padding: "9px 12px", fontSize: 10, borderRight: "1px solid var(--border-dim)" }}>{item.field}</div>
            <div className="text-mono-label" style={{ padding: "9px 12px", fontSize: 9, color: "var(--fg-secondary)", lineHeight: 1.5 }}>{item.reason}</div>
            <div style={{ padding: "9px 12px", borderLeft: "1px solid var(--border-dim)", display: "flex", alignItems: "center" }}>
              <span className="badge" style={{ color: "var(--status-warn)", borderColor: "var(--status-warn)", fontSize: 9, whiteSpace: "nowrap" }}>{item.flag}</span>
            </div>
          </div>
        ))}
      </div>
      {/* Vocabulary states */}
      <div style={{ border: "1px solid var(--border)" }}>
        <SectionHead label="[ AUDIT / VOCABULARY STATES ]" />
        {[
          { field: "FINISH",            state: "MATCHED",    count: "IN APPROVED LIST" },
          { field: "NOISE LEVEL",       state: "MATCHED",    count: "STANDARDIZED UNIT" },
          { field: "INSTALLATION TYPE", state: "MATCHED",    count: "IN APPROVED LIST" },
          { field: "CAPACITY",          state: "FIRST SEEN", count: "NEW VALUE — ADDING TO VOCAB" },
          { field: "BRAND",             state: "FLAGGED",    count: "INFERRED — NEEDS CONFIRM" },
        ].map((item) => {
          const color = item.state === "MATCHED" ? "var(--status-ok)" : item.state === "FIRST SEEN" ? "var(--status-warn)" : "var(--accent)";
          return (
            <div key={item.field} style={{ display: "grid", gridTemplateColumns: "140px 1fr auto", borderTop: "1px solid var(--border-dim)" }}>
              <div className="text-mono-label" style={{ padding: "9px 12px", fontSize: 10, borderRight: "1px solid var(--border-dim)" }}>{item.field}</div>
              <div className="text-mono-label" style={{ padding: "9px 12px", fontSize: 9, color: "var(--fg-secondary)" }}>{item.count}</div>
              <div style={{ padding: "9px 12px", borderLeft: "1px solid var(--border-dim)", display: "flex", alignItems: "center" }}>
                <span className="badge" style={{ color, borderColor: color, fontSize: 9 }}>{item.state}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Stage 10 — Map Output */
function Stage10Content() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ border: "1px solid var(--border)" }}>
        <SectionHead label="[ MAP OUTPUT / DELIVERY FORMAT COLUMNS ]" />
        {[
          { col: "ITEM_ID",             value: "FGID2466QF4A" },
          { col: "MFR_PART_NUMBER",     value: "FGID2466QF4A" },
          { col: "BRAND_NAME",          value: "Frigidaire" },
          { col: "MANUFACTURER_NAME",   value: "Frigidaire Company" },
          { col: "UNSPSC_CODE",         value: "40181501" },
          { col: "UNSPSC_CLASSPATH",    value: "Appliances → Dishwashers → Household Dishwashers" },
          { col: "SHORT_DESC_MOBILE",   value: "Frigidaire 24 in Built-In Dishwasher 47 dB" },
          { col: "SHORT_DESC_INVOICE",  value: "Frigidaire 24 in Built-In Dishwasher EvenDry 47 dB SS" },
          { col: "SHORT_DESC",          value: "Frigidaire 24 in Built-In Dishwasher EvenDry 47 dB Stainless Steel" },
          { col: "LONG_DESC",           value: "Frigidaire 24 in Built-In Dishwasher with EvenDry..." },
          { col: "ATTR_FINISH",         value: "Stainless Steel" },
          { col: "ATTR_NOISE_LEVEL",    value: "47 dB" },
          { col: "ATTR_WIDTH",          value: "24 in" },
          { col: "ATTR_CAPACITY",       value: "14 Place Settings" },
          { col: "ATTR_INSTALL_TYPE",   value: "Built-In" },
        ].map((item, i) => (
          <div key={item.col} style={{ display: "grid", gridTemplateColumns: "220px 1fr", borderTop: i > 0 ? "1px solid var(--border-dim)" : "none" }}>
            <div className="text-mono-label" style={{ padding: "8px 12px", fontSize: 10, borderRight: "1px solid var(--border-dim)", color: "var(--mono-meta)" }}>{item.col}</div>
            <div className="text-mono-data" style={{ padding: "8px 12px", fontSize: 12 }}>{item.value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/records" className="btn-primary">
          VIEW FULL RECORD
          <ArrowRight size={14} weight="bold" />
        </Link>
        <Link href="/pipeline" className="btn-ghost">
          PROCESS ANOTHER
        </Link>
      </div>
    </div>
  );
}

const STAGE_CONTENT: React.FC[] = [
  Stage01Content, Stage02Content, Stage03Content, Stage04Content,
  Stage05Content, Stage06Content, Stage07Content, Stage08Content,
  Stage09Content, Stage10Content,
];

/* Stage summaries for completed state */
const STAGE_SUMMARIES = [
  "1 placeholder stripped — BRAND treated as null",
  "Frigidare → Frigidaire Company (conf 0.94) — Brand inferred",
  "UNSPSC 40181501 — Household Dishwashers — 10 attrs expected",
  "7 attrs extracted — 4 from description, 3 from site:frigidaire.com",
  "UOM standardized — decimal→fraction applied",
  "6 fields ENTAILED — 1 UNVERIFIED (Energy Star)",
  "2 conflicts resolved — 1 accepted, 1 flagged",
  "6 description variants built by formula",
  "9/10 fields filled — 2 flagged for human review — avg conf 0.95",
  "15 Delivery Format columns mapped — record ready",
];

/* ─────────────────────────────────────────────────────────────
   Main PipelineLivePage
   ───────────────────────────────────────────────────────────── */
export default function PipelineLivePage() {
  const reduce = useReducedMotion();
  const ease   = [0.16, 1, 0.3, 1] as const;

  const [statuses, setStatuses] = useState<StageStatus[]>(
    STAGES.map(() => "queued")
  );
  const [selected, setSelected] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);   // 0-100 for active stage bar
  const progRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const stageRef = useRef(0);

  const advanceStage = useCallback((idx: number) => {
    if (idx >= STAGES.length) return;
    stageRef.current = idx;
    setStatuses((prev) => {
      const next = [...prev];
      if (idx > 0) next[idx - 1] = "done";
      next[idx] = "active";
      return next;
    });
    setSelected(idx);
    setProgress(0);

    const dur = reduce ? 50 : STAGES[idx].duration;
    const tick = 60;
    let elapsed = 0;

    if (progRef.current) clearInterval(progRef.current);
    progRef.current = setInterval(() => {
      elapsed += tick;
      setProgress(Math.min((elapsed / dur) * 100, 100));
      if (elapsed >= dur) {
        if (progRef.current) clearInterval(progRef.current);
        if (idx === STAGES.length - 1) {
          setStatuses((prev) => {
            const next = [...prev];
            next[idx] = "done";
            return next;
          });
        } else {
          advanceStage(idx + 1);
        }
      }
    }, tick);
  }, [reduce]);

  useEffect(() => {
    const delay = setTimeout(() => advanceStage(0), 400);
    return () => {
      clearTimeout(delay);
      if (progRef.current) clearInterval(progRef.current);
    };
  }, [advanceStage]);

  const totalDone = statuses.filter((s) => s === "done").length;
  const overallPct = Math.round((totalDone / STAGES.length) * 100);
  const allDone = totalDone === STAGES.length;

  const StageContent = STAGE_CONTENT[selected];

  return (
    <>
      <div className="noise-overlay" aria-hidden="true" />
      <main style={{ paddingTop: 56 }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", borderLeft: "1px solid var(--border)", borderRight: "1px solid var(--border)", minHeight: "calc(100dvh - 56px)", display: "grid", gridTemplateColumns: "300px 1fr" }}>

          {/* ── LEFT: Stage sidebar ── */}
          <div style={{ borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div style={{ padding: "24px 20px", borderBottom: "1px solid var(--border)" }}>
              <div className="text-mono-label" style={{ marginBottom: 8, color: "var(--accent)" }}>[ PIPELINE / LIVE ]</div>
              <div className="text-display" style={{ fontSize: "1.4rem", marginBottom: 16 }}>
                FGID2466QF4A
              </div>
              {/* Overall progress bar */}
              <div style={{ marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span className="text-mono-label" style={{ fontSize: 10 }}>OVERALL PROGRESS</span>
                  <span className="text-mono-label" style={{ fontSize: 10, color: allDone ? "var(--status-ok)" : "var(--fg-secondary)" }}>
                    {allDone ? "COMPLETE" : `${overallPct}%`}
                  </span>
                </div>
                <div style={{ height: 2, backgroundColor: "var(--border)", position: "relative" }}>
                  <motion.div
                    style={{ position: "absolute", left: 0, top: 0, height: "100%", backgroundColor: allDone ? "var(--status-ok)" : "var(--accent)" }}
                    initial={{ width: "0%" }}
                    animate={{ width: `${overallPct}%` }}
                    transition={{ duration: 0.4, ease }}
                  />
                </div>
              </div>
            </div>

            {/* Stage list */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {STAGES.map((stage, i) => {
                const status = statuses[i];
                const isActive   = status === "active";
                const isDone     = status === "done";
                const isSelected = selected === i;

                return (
                  <button
                    key={stage.id}
                    onClick={() => setSelected(i)}
                    aria-current={isSelected ? "step" : undefined}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      background: isSelected ? "var(--bg-surface)" : "transparent",
                      border: "none",
                      borderTop: "1px solid var(--border-dim)",
                      borderLeft: `3px solid ${isActive ? "var(--accent)" : isDone ? "var(--status-ok)" : "transparent"}`,
                      padding: "12px 16px",
                      cursor: "pointer",
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      transition: "background 150ms ease",
                    }}
                  >
                    {/* Number */}
                    <span className="text-mono-data" style={{ fontSize: 11, color: isActive ? "var(--accent)" : isDone ? "var(--status-ok)" : "var(--mono-meta)", flexShrink: 0, width: 22 }}>
                      {stage.id}
                    </span>

                    {/* Label + summary */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="text-mono-data" style={{ fontSize: 11, letterSpacing: "0.06em", color: isActive ? "var(--fg-primary)" : isDone ? "var(--fg-secondary)" : "var(--fg-dim)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {stage.label}
                      </div>
                      {isDone && (
                        <div className="text-mono-label" style={{ fontSize: 9, color: "var(--mono-meta)", lineHeight: 1.4, whiteSpace: "normal" }}>
                          {STAGE_SUMMARIES[i]}
                        </div>
                      )}
                    </div>

                    {/* Status icon */}
                    {isDone && <CheckCircle size={13} weight="bold" style={{ color: "var(--status-ok)", flexShrink: 0, marginTop: 1 }} />}
                    {isActive && <span style={{ width: 6, height: 6, backgroundColor: "var(--accent)", display: "block", flexShrink: 0, marginTop: 3, animation: "pulse-dot 700ms infinite" }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── RIGHT: Stage detail ── */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Stage header */}
            <div style={{ padding: "24px 40px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div>
                <div className="text-mono-label" style={{ marginBottom: 8, color: "var(--accent)" }}>
                  STAGE {STAGES[selected].id} OF 10
                </div>
                <h2 className="text-display" style={{ fontSize: "clamp(1.4rem, 2.5vw, 2.2rem)" }}>
                  {STAGES[selected].label}.
                </h2>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span className="badge" style={{
                  color: statuses[selected] === "done" ? "var(--status-ok)" : statuses[selected] === "active" ? "var(--accent)" : "var(--fg-dim)",
                  borderColor: statuses[selected] === "done" ? "var(--status-ok)" : statuses[selected] === "active" ? "var(--accent)" : "var(--border)",
                }}>
                  {statuses[selected].toUpperCase()}
                </span>
              </div>
            </div>

            {/* Active stage progress bar */}
            {statuses[selected] === "active" && (
              <div style={{ height: 2, backgroundColor: "var(--border)", position: "relative", flexShrink: 0 }}>
                <motion.div
                  style={{ position: "absolute", left: 0, top: 0, height: "100%", backgroundColor: "var(--accent)" }}
                  initial={{ width: "0%" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.06, ease: "linear" }}
                />
              </div>
            )}

            {/* Stage content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={selected}
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease }}
                >
                  {statuses[selected] === "queued" ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 12 }}>
                      <span style={{ width: 8, height: 8, backgroundColor: "var(--border)", display: "block" }} />
                      <span className="text-mono-label" style={{ color: "var(--fg-dim)" }}>
                        STAGE QUEUED — AWAITING PREVIOUS STAGES
                      </span>
                    </div>
                  ) : (
                    <StageContent />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
