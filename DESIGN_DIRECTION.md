# SpecForge — Design Direction (Locked)

## Design Read

**"Reading this as: B2B industrial data-processing tool for technical buyers (catalog managers, data engineers, procurement ops teams), with a precision-instrument language, leaning toward Industrial Brutalism (Tactical Telemetry / Dark mode) fused with the structural rigour of `design-taste-frontend`."**

---

## Skill Decision

**Primary skill:** `industrial-brutalist-ui` → **Tactical Telemetry & CRT Terminal** mode  
**Secondary guidance from:** `design-taste-frontend` (anti-slop rules, motion discipline, dial system, layout hard rules)

### Why Industrial Brutalism (Tactical Telemetry)?

SpecForge is not a consumer product. It is a pipeline. It processes messy industrial catalog rows through ten sequential stages and produces structured product records. The product's own mechanism — raw input → governed output — IS the visual language.

- **Precision tool, not lifestyle app.** The aesthetic must feel like a system that respects data accuracy above all else.
- **Data density is the feature.** Ten pipeline stages, UNSPSC codes, classpath hierarchies, attribute vocabularies, confidence scores, adjudication logs — this data IS the UI.
- **The mechanism is the story.** One authored pipeline-scan motion sequence per page.
- **Anti-purple mandate respected.** Aviation Red `#E61919` is the ONLY accent — never purple, gradient, or blue AI-glow.

---

## Dial Settings

| Dial | Value | Reasoning |
|---|---|---|
| `DESIGN_VARIANCE` | **5** | Rigid grid with mechanical precision. Consistency is trust. |
| `MOTION_INTENSITY` | **5** | One authored pipeline-reveal per page. No decorative scatter. |
| `VISUAL_DENSITY` | **8** | Data-heavy tool. Bimodal: dense data + vast negative space framing macro headers. |

---

## Color System (Locked)

**Mode:** Dark only — Tactical Telemetry. No light/dark toggle. No section flips.

| Token | Value | Usage |
|---|---|---|
| `--bg-root` | `#0D0D0D` | Page root |
| `--bg-surface` | `#111111` | Cards, panels |
| `--bg-elevated` | `#161616` | Nested containers, header bars |
| `--border` | `#222222` | 1px solid structural dividers |
| `--border-dim` | `#1A1A1A` | Hairline dividers within dense data areas |
| `--fg-primary` | `#E8E8E8` | Primary text (white phosphor) |
| `--fg-secondary` | `#6B6B6B` | Secondary labels, metadata |
| `--fg-dim` | `#3A3A3A` | Disabled states, empty-state text |
| `--accent` | `#E61919` | Aviation Red — the ONLY accent |
| `--accent-dim` | `#7A0D0D` | Dimmed red for hover on danger actions |
| `--status-ok` | `#4AF626` | Terminal Green — ONLY for confirmed/matched status |
| `--status-warn` | `#D4A017` | Amber — flagged/review states |
| `--mono-meta` | `#4B4B4B` | Monospace metadata, line numbers |

---

## Typography System (Locked)

| Role | Font | Scale | Details |
|---|---|---|---|
| Display / Headers | `Archivo Black` | `clamp(3rem, 8vw, 12rem)` | UPPERCASE, tracking `-0.04em`, leading `0.9` |
| UI / Body | `IBM Plex Sans` 400/500/600 | `13px–15px` | Natural tracking, leading `1.5` |
| Telemetry / Metadata | `JetBrains Mono` 400/500 | `10px–13px` | UPPERCASE, tracking `0.06em`, leading `1.3` |

---

## Motion Vocabulary (Locked)

One authored sequence per page. No decorative hover scatter.

| Trigger | Motion | Timing |
|---|---|---|
| Pipeline stage activation | Scan sweep left→right, stage lights sequentially | `600ms/stage`, exponential ease |
| Page entry | Text stagger-reveal `opacity:0 → 1, translateY:16px → 0` | `500ms`, stagger `60ms` |
| Data field resolution | Typewriter lock-in + accent flash | `400ms` typewriter + `80ms` flash |
| Button `:active` | `scale(0.97)` | `100ms` |
| Error state | Shake `translateX` oscillation | `300ms` |
| Accordion | `scaleY` expand from top | `250ms cubic-bezier(0.32,0.72,0,1)` |

`prefers-reduced-motion`: All animations disabled.

---

## Layout System (Locked)

- **Grid:** CSS Grid throughout. No flex percentage math.
- **Radius:** `0` — all corners exactly 90°.
- **Borders:** `1px solid var(--border)` for all compartments.
- **Grid dividers:** `display:grid; gap:1px` with contrasting parent/child backgrounds.
- **Section padding:** `80px–120px` vertical on desktop.
- **Max width:** `1440px` centered, `16px` gutters on mobile.
- **Nav:** Fixed top, single line, height `56px`, monospace UPPERCASE labels.

---

## Component Identity (Locked)

- **Status badges:** `border: 1px solid` status color, transparent bg, monospace, square corners.
- **Inputs:** Underline-style — `border-bottom: 1px solid var(--border)` only.
- **Pipeline stage cells:** Numbered `[01]`–`[10]`, mono. Active = `3px solid var(--accent)` left border.
- **Provenance tags:** `[ MANUFACTURER SOURCE ]` `[ DESCRIPTION ONLY ]` — bracketed, monospace, inline.
- **Vocabulary states:** `FIRST SEEN` · `MATCHED` · `FLAGGED` — uppercase badge in status color.

---

## Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind v4 + CSS custom properties
- **Animation:** `motion/react` + native CSS
- **Icons:** `@phosphor-icons/react` (Light variant, consistent)
- **Fonts:** `next/font/google` — Archivo Black, IBM Plex Sans, JetBrains Mono

---

## Anti-Patterns Banned

- ❌ Purple/blue gradients · gradient text · glass/blur decoration
- ❌ Icon+heading+text card grids · hero-metric templates
- ❌ Decorative sparklines or progress rings
- ❌ Tracked-uppercase eyebrow on every section
- ❌ Generic flat SaaS-dashboard background
- ❌ Login/auth gate (primary action goes straight into the app)
- ❌ `border-radius` > 0 on structural elements
- ❌ Any accent color other than Aviation Red
- ❌ Terminal Green as general text color
- ❌ Placeholder brand values rendered as real content
