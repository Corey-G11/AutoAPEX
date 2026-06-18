# AutoApex Re-Theme Spec — "Emerald Dynasty"

Regal, timeless, refined. NOT neon / cyberpunk. This document is the design contract for the Frontend agent.
Scope: `apex-web/src/App.jsx` and `apex-mobile/App.js`. Use the EXACT hex values below — do NOT invent alternatives.

---

## 1. Canonical Design Tokens (single source of truth — verbatim)

User-specified (locked):
- Background base (deepest app bg):  `#071B1E`
- Background panel (cards/surfaces): `#0A2A28`
- Background elevated (inputs/raised/hover): `#103F46`
- Accent / primary CTA (mint):       `#7FE6B8`
- Secondary accent (champagne gold): `#D8C08A`
- Primary text (ivory):              `#F2EDE1`

Derived (regal, low-saturation — use exactly):
- Hairline border/divider:           `#1C4F54`
- Secondary text/labels (muted):     `#AFC4BA`
- Tertiary text/captions (faint):    `#6F8881`
- Deep mint (secondary positive):    `#5FCFA0`
- Muted regal red (danger/over):     `#C45B5B`   (NOT neon red)
- Bronze (above-market warn):        `#C9A24B`

Deal tiers (keep semantics, regal palette):
- great → `#7FE6B8`
- below → `#5FCFA0`
- market → `#D8C08A`
- above → `#C9A24B`
- over → `#C45B5B`

Typography:
- Display (headings + prices): `'Cormorant Garamond', serif` (Google Fonts; weights 500/600/700) — replaces `'Bricolage Grotesque'`.
- Labels/data/UI/mono: keep `'IBM Plex Mono', monospace`.
- Regal tuning: slightly increased letter-spacing on headings; prices in Cormorant 600; generous padding.
- Neon-green glows/box-shadows → mint `#7FE6B8` at reduced opacity (subtle, refined).

---

## 2. Web token mapping — `ROOT_VARS` (App.jsx lines 508–513)

The web app has a token layer in two places: the `ROOT_VARS` object (inline CSS variables) and the `CSS` template literal. Map each `:root` var to a new value:

| CSS var          | Old value   | New value   | Token name                     |
|------------------|-------------|-------------|--------------------------------|
| `--bg`           | `#08090b`   | `#071B1E`   | Background base                |
| `--panel`        | `#0f1216`   | `#0A2A28`   | Background panel               |
| `--panel2`       | `#14181d`   | `#103F46`   | Background elevated            |
| `--border`       | `#222831`   | `#1C4F54`   | Hairline border                |
| `--text`         | `#e9edf2`   | `#F2EDE1`   | Primary text (ivory)           |
| `--muted`        | `#878f99`   | `#AFC4BA`   | Secondary text                 |
| `--faint`        | `#565d67`   | `#6F8881`   | Tertiary text                  |
| `--green`        | `#34e89e`   | `#5FCFA0`   | Deep mint (secondary positive) |
| `--green-bright` | `#4dffb0`   | `#7FE6B8`   | Mint (primary accent/CTA)      |
| `--amber`        | `#ffc24b`   | `#C9A24B`   | Bronze (above-market warn)     |
| `--red`          | `#ff6b6b`   | `#C45B5B`   | Muted regal red                |
| `--cyan`         | `#5cd6ff`   | `#D8C08A`   | Champagne gold (secondary)     |

Note: `--cyan` has no neon-friendly counterpart in Emerald Dynasty. It is used for the symbol/ticker accent, input-focus ring, retry/sample links, and `<code>` text. Remap it to champagne gold `#D8C08A` (refined secondary accent). Keep the var name `--cyan` to avoid churn, OR rename to `--gold` — Frontend agent's choice, but if renamed, update all ~8 consumers.

### Web `TIERS` mapping (App.jsx lines 21–27)

| tier   | Old value | New value | Token   |
|--------|-----------|-----------|---------|
| great  | `#4dffb0` | `#7FE6B8` | mint    |
| below  | `#34e89e` | `#5FCFA0` | deep mint |
| market | `#ffc24b` | `#D8C08A` | champagne gold |
| above  | `#ff8f6b` | `#C9A24B` | bronze  |
| over   | `#ff6b6b` | `#C45B5B` | regal red |

---

## 3. Mobile token mapping — `C` object (App.js lines 20–33)

| `C` key       | Old value | New value | Token                |
|---------------|-----------|-----------|----------------------|
| `bg`          | `#08090b` | `#071B1E` | Background base      |
| `panel`       | `#0f1216` | `#0A2A28` | Background panel     |
| `panel2`      | `#141820` | `#103F46` | Background elevated  |
| `border`      | `#222831` | `#1C4F54` | Hairline border      |
| `text`        | `#e8edf2` | `#F2EDE1` | Primary text (ivory) |
| `muted`       | `#8b97a6` | `#AFC4BA` | Secondary text       |
| `faint`       | `#5a6573` | `#6F8881` | Tertiary text        |
| `green`       | `#34e89e` | `#5FCFA0` | Deep mint            |
| `greenBright` | `#4dffb0` | `#7FE6B8` | Mint (primary accent)|
| `amber`       | `#ffc24b` | `#C9A24B` | Bronze               |
| `red`         | `#ff6b6b` | `#C45B5B` | Regal red            |
| `cyan`        | `#5ad1ff` | `#D8C08A` | Champagne gold       |

### Mobile `TIERS` mapping (App.js lines 35–41)

`great`, `below`, `market`, `over` already reference `C.*` and will update automatically once `C` is changed:
- great → `C.greenBright` → `#7FE6B8` ✔ (auto)
- below → `C.green` → `#5FCFA0` ✔ (auto)
- market → `C.amber` → `#C9A24B` ✗ — semantics want champagne gold `#D8C08A`, NOT bronze. Change `market` to reference `C.cyan` (gold) OR hardcode `#D8C08A`. ACTION REQUIRED.
- above → hardcoded `#ff9f45` → change to `C.amber` (`#C9A24B`, bronze). HARDCODED — see audit.
- over → `C.red` → `#C45B5B` ✔ (auto)

---

## 4. Font plan

### Web (App.jsx, CSS lines 515–521)
- Replace the `@import` (line 516): swap `Bricolage Grotesque` for `Cormorant Garamond`:
  `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');`
- Update `.disp` (line 521): `font-family:'Cormorant Garamond', Georgia, serif;`
- `.mono` (line 520) unchanged — keep IBM Plex Mono.
- Cormorant is a thin serif; bump display weights. Where current `.disp` uses `fontWeight: 800` (header brand 416, price 187, stat 489), set to 600–700 and increase size +2–4px to keep optical weight. Prices in Cormorant 600.
- Headings: add letter-spacing `0.01em`–`0.02em` (Cormorant reads better with slight positive tracking; the current `-0.03em`/`-0.04em` negative tracking on `.disp` should be removed/relaxed to near 0).

### Mobile (App.js)
- Expo: load `Cormorant Garamond` via `expo-font` / `@expo-google-fonts/cormorant-garamond` (`useFonts`), or `expo-google-fonts`. Display text currently uses default system font with `fontWeight: "800"` (brand 568, title 595, price 599, statValue 577, fab/primary). Introduce a `display` font constant alongside `mono` (line 564) and apply it to those styles, weight 600/700, sizes +1–3px.
- Keep `mono` (Menlo/monospace) for all label/data/UI text.

---

## 5. Spacing / regal tuning recommendations

Grounded in current values:
- Card padding: web `.term-card` 14px (line 522) → 18px; mobile `card` 16px (589) → 20px. Generous, gallery-like.
- Card radius: web 14px → 16–18px; mobile 16px → 18px. Softer, less terminal.
- Header padding: web `18px 18px 12px` (412) → `24px 22px 16px`; mobile header (567) paddingTop 14 → 20, horizontal 18 → 22.
- Section gaps between cars: web `gap: 12` (453) → 14–16; mobile FlatList card `marginBottom: 12` (589) → 16.
- Heading tracking: brand "APEX" web letterSpacing `-0.04em` (416) → `0.02em`; mobile brand `letterSpacing: 1` (568) → `1.5`. Section/empty headings similar.
- Tone down motion/glow: caret blink, scanbar, livedot pulse keep but use mint at low opacity. The radial glow (line 517 `rgba(77,255,176,.07)`) → mint `rgba(127,230,184,.06)` or lower. Grid-line overlays — reduce to near-invisible for a calmer surface.

---

## 6. Hardcoded-color audit — checklist for Frontend agent

Color literals written inline (in JSX/StyleSheet/CSS) that BYPASS the token layer. Each must be replaced with a token reference (or the token's hex if inline-only).

### Web — `App.jsx`

- [ ] **L22–26 `TIERS` object** — `#4dffb0`, `#34e89e`, `#ffc24b`, `#ff8f6b`, `#ff6b6b`. Tier colors hardcoded (not refs). → great `#7FE6B8`, below `#5FCFA0`, market `#D8C08A`, above `#C9A24B`, over `#C45B5B`.
- [ ] **L110 RangeBar track gradient** — `linear-gradient(90deg, rgba(77,255,176,.45), rgba(255,194,75,.4) 55%, rgba(255,107,107,.45))`. Neon green→amber→red. → mint `rgba(127,230,184,.45)` → gold `rgba(216,192,138,.4)` → regal red `rgba(196,91,91,.45)`.
- [ ] **L112 RangeBar best-price dot** — `background: ... : "#fff"` (the not-below-range dot fill) and glow `boxShadow: "0 0 0 2px rgba(77,255,176,.55), 0 0 10px rgba(77,255,176,.5)"`. → dot fill ivory `#F2EDE1` (or keep `#fff`); glow → mint `rgba(127,230,184,.4)` reduced opacity, refined.
- [ ] **L157 CarRow top-card border/shadow** — `rgba(77,255,176,.45)`, `rgba(77,255,176,.25)`, `rgba(77,255,176,.07)`. Neon green glow. → mint `rgba(127,230,184,...)`, reduced for subtlety.
- [ ] **L429 missing-API warning banner** — `background: rgba(255,194,75,.08)`, `border: 1px solid rgba(255,194,75,.35)`. Amber-derived literals. → bronze `rgba(201,162,75,.08)` / `rgba(201,162,75,.35)`.
- [ ] **L533 `.primary` CTA text color** — `color:#04120c` (dark text on mint button). Acceptable as on-accent ink; recommend deepen to base `#071B1E` or keep a near-black. Document as intentional.
- [ ] **L536 `.primary.danger`** — `color:#1a0606` (dark text on red button). On-accent ink. → `#071B1E` or keep; document as intentional.
- [ ] **L537 `.fab` text + shadow** — `color:#04120c`; `box-shadow:0 8px 26px rgba(77,255,176,.32)`. → ink `#071B1E`; glow → mint `rgba(127,230,184,.22)` reduced.
- [ ] **L539 `.overlay`** — `background:rgba(4,5,7,.72)`. Modal scrim from old near-black bg. → derive from new base: `rgba(7,27,30,.72)`.
- [ ] **L540/541 `.sheet`/`.modal` shadows** — `rgba(0,0,0,.5)` / `rgba(0,0,0,.55)`. Neutral black shadows; acceptable but consider deepening to base tint. Low priority.
- [ ] **L517 `.apex-root` background** — radial `rgba(77,255,176,.07)` glow + grid `rgba(255,255,255,.022)` lines. → mint `rgba(127,230,184,.05)`; grid stays low-alpha ivory or reduce further.
- [ ] **L519 `::selection`** — `background:rgba(77,255,176,.25)`. → mint `rgba(127,230,184,.25)`.
- [ ] **L529 `.seg[data-on]`** — `background:rgba(77,255,176,.1)`, `border-color:rgba(77,255,176,.5)`. → mint equivalents.
- [ ] **L532 `.term-input:focus`** — `box-shadow:0 0 0 3px rgba(92,214,255,.16)` (cyan focus ring). → champagne gold `rgba(216,192,138,.16)`.
- [ ] **L542 `.scanbar`** — gradient uses `var(--green-bright)` (token, OK once remapped). No literal.
- [ ] **L545 `.ticker-wrap`** — `background:rgba(15,18,22,.7)` (old panel tint). → new panel tint `rgba(10,42,40,.7)`.

### Mobile — `App.js`

- [ ] **L39 `TIERS.above`** — hardcoded `"#ff9f45"`. → `C.amber` (bronze `#C9A24B`) after `C` remap, OR `#C9A24B` literal.
- [ ] **L38 `TIERS.market`** — references `C.amber`. After remap `C.amber` = bronze `#C9A24B`, but spec wants market = champagne gold `#D8C08A`. Change ref to `C.cyan` (gold) or literal `#D8C08A`.
- [ ] **L581 `sortTabOn`** — `backgroundColor: "rgba(77,255,176,0.08)"`. Neon green literal. → mint `rgba(127,230,184,0.08)`.
- [ ] **L592 `topBadgeText`** — `color: "#04120c"` (ink on mint badge). On-accent ink → `#071B1E` or keep; document.
- [ ] **L625 `fabText`** — `color: "#04120c"`. On-accent ink → `#071B1E` or keep; document.
- [ ] **L627 `overlay`** — `backgroundColor: "rgba(4,5,7,0.72)"`. Scrim from old base. → `rgba(7,27,30,0.72)`.
- [ ] **L634 `segOn`** — `backgroundColor: "rgba(77,255,176,0.08)"`. → mint `rgba(127,230,184,0.08)`.
- [ ] **L639 `primaryText`** — `color: "#04120c"` (ink on mint CTA). → `#071B1E` or keep; document.
- [ ] Note: `cardTop`/`topBadge`/`rangeDot`/`fab` shadows reference `C.greenBright` (token) — update automatically; verify glow reads subtle, not neon (RN shadowOpacity 0.9 on `rangeDot` L614 is strong — reduce to ~0.4 for refined feel).

### Confirmed token-clean (no action beyond token remap)
- All `var(--*)` references in App.jsx and all `C.*` references in App.js update automatically when the token layer is remapped. The audit above lists ONLY the literals that bypass tokens.

---

## 7. Gaps in the token system

- **No dedicated "gold/secondary-accent" token.** Web reuses `--cyan` and mobile reuses `cyan` for what is now champagne gold. Recommend renaming `cyan` → `gold` in both for clarity (optional; functional either way since values are remapped).
- **On-accent ink color is hardcoded everywhere** (`#04120c`, `#1a0606`) with no token. Recommend adding a token (e.g. web `--ink: #071B1E`, mobile `C.ink`) so button text on mint/red CTAs is centralized. Currently 5 inline occurrences (web L533, L536, L537; mobile L592, L625, L639).
- **Scrim/overlay color hardcoded** (`rgba(4,5,7,...)`) in both — no token. Optional: add `--scrim` token.
- **Display font** is currently set per-`.disp`/per-style; mobile has no display-font constant at all (only `mono`, L564). Add a `display` constant for maintainability.
