# SpecForge (specforage) — Universal Industrial Product Intelligence Platform

> **Category-Agnostic Product Intelligence for Industrial Commerce**  
> SpecForge turns messy distributor catalog rows (MPN, truncated short descriptions, informal brand names, misspelled manufacturers) into structured, controlled-vocabulary-compliant, delivery-ready product records anchored to the public **UNSPSC taxonomy**.

---

## 🛠 System Architecture & 10-Stage Deterministic Pipeline

```
Raw Distributor Row [MPN + Short Description + Brand/Mfr]
      │
      ▼
01. CLEAN ───────────────────► Strips placeholder strings ("-- No Unilog Brand --", "N/A", "Unknown")
      │
02. RESOLVE MFR / BRAND ─────► Levenshtein fuzzy matching & canonical parent corporate registry lookup
      │
03. CLASSIFY ────────────────► Categorizes to public UNSPSC 8-digit commodity codes (55,000+ hierarchy)
      │
04. EXTRACT ─────────────────► Restricted query execution strictly on official manufacturer domains
      │
05. NORMALIZE ───────────────► Standardizes units of measure (UOM) and converts decimals to standard fractions
      │
06. VERIFY ──────────────────► Source entailment engine validates every claim against authoritative text
      │
07. ADJUDICATE ──────────────► Deterministic conflict resolution with priority rankings and tolerance bounds
      │
08. BUILD DESCRIPTION ───────► Formula-based slot compilation across 6 length-enforced channels (Zero Hallucination)
      │
09. AUDIT ───────────────────► Tri-state vocabulary assignment (MATCHED / FIRST SEEN / FLAGGED) & confidence scoring
      │
10. MAP OUTPUT ──────────────► Direct emission to 15 Delivery Format columns ready for ERP/PIM ingestion
```

---

## 🚀 Key Modules & Capabilities

1. **Live 10-Stage Pipeline Engine (`/pipeline` & `/pipeline/live`)**  
   Real-time telemetry progress tracker across all 10 sequential pipeline stages with active scan indicators, dispute logs, and description builders.

2. **Product Intelligence Repository (`/records`)**  
   Multi-category industrial catalogue browser covering Dishwashers (`40181501`), Stainless Steel Pipe Fittings (`40141720`), Miniature Circuit Breakers (`39121603`), and Industrial Ball Valves (`40141607`). Full attribute provenance matrix and 6-variant description suite.

3. **UNSPSC Taxonomy & Classification Explorer (`/taxonomy`)**  
   Interactive 4-tier tree hierarchy (Segment → Family → Class → Commodity), governed property schemas per commodity, and real-time description classifier sandbox.

4. **Source Provenance & Discipline Inspector (`/provenance`)**  
   100% manufacturer-domain-only restriction (`site:<verified_mfr_domain>`), hard-enforced marketplace blocklist (Amazon, eBay, Grainger, Ferguson, Alibaba), and factual entailment snippet traces.

5. **Controlled Vocabulary Governance (`/vocabulary`)**  
   Tri-state vocabulary engine (`MATCHED`, `FIRST SEEN`, `FLAGGED`), live normalizer resolver sandbox, synonym mappings, and one-click term promotion workflows.

6. **Conflict Adjudication Studio (`/adjudication`)**  
   Side-by-side discrepancy comparator, deterministic priority order matrix, step-by-step reasoning audit logs, and catalog governor override controls.

7. **Formula-Based Description Generator (`/descriptions`)**  
   6 length-budgeted channels (`MOBILE` 50ch, `INVOICE` 60ch, `SHORT` 80ch, `LONG` 200ch, `RETAIL` 150ch, `MARKETING` 500ch) with interactive token slot templates and character overflow meters.

8. **Batch Telemetry & Delivery Export Studio (`/batch` & `/batch/live`)**  
   High-throughput multi-row queue runner, live stage progress gauges, deep row telemetry inspector, and RFC-4180 Delivery Format CSV export generator.

9. **Quality Governance & Audit Dossier (`/audit`)**  
   Quality scorecard tracking 4 operational pillars (Classification Coverage, Fill Rate, Confidence, Entailment), human review queue, immutable audit event stream, and 1-click dossier export.

10. **Pipeline Configuration & Settings Studio (`/settings`)**  
    Tunable confidence thresholds (0.50-0.99), Levenshtein edit distance limits, source discipline toggles, and delivery format column customizer.

---

## 🎨 Visual Identity: Industrial Brutalism (Tactical Telemetry)

- **Palette**: Dark Mode (`#0D0E11` root background, `#14161B` surface), Aviation Red (`#E61919`) as the primary accent, Signal Green (`#4AF626`) for verified statuses, and Amber (`#D4A017`) for review queues.
- **Typography**: `Archivo Black` for heavy display titles, `IBM Plex Sans` for body text, and `JetBrains Mono` for data tables, telemetry labels, and code tokens.
- **Surface**: Subtle CRT scanline noise overlay, high-contrast borders, zero rounded pill cards, and clear hierarchy.

---

## 💻 Tech Stack & Deployment

- **Framework**: Next.js 14 (App Router) + React 18 + TypeScript
- **Styling**: Vanilla CSS Design System with CSS Tokens (`globals.css`)
- **Animation & Motion**: Motion (Framer Motion) with `useReducedMotion` accessibility compliance
- **Icons**: Phosphor Icons React
- **Repository**: [https://github.com/Sameer8549/specforage](https://github.com/Sameer8549/specforage)

---

## 📦 Getting Started

```bash
# Clone the repository
git clone https://github.com/Sameer8549/specforage.git
cd specforage/specforage-app

# Install dependencies
npm install

# Run the local development server
npm run dev

# Build production bundle
npm run build
```

Open [http://localhost:3000](http://localhost:3000) to launch the SpecForge interface.
