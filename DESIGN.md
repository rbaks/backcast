# DESIGN.md — mdapp terminal

Design system for the Bloomberg-terminal-style portfolio backtest app.
Classifier: **APP UI** (data-dense workspace). Calm surface, dense but readable,
one accent, minimal chrome. Approved via /plan-design-review 2026-06-20.

## Tokens

CSS variables. Dark is default; `[data-theme="light"]` overrides.

| Token | Dark | Light | Use |
|-------|------|-------|-----|
| `--bg` | `#0a0e14` | `#f5f6f8` | app background |
| `--panel` | `#0f141d` | `#ffffff` | panel headers, top bar |
| `--panel-2` | `#131a24` | `#eef1f5` | secondary surface |
| `--border` | `#1f2a38` | `#d6dce4` | panel/grid dividers |
| `--text` | `#c9d4e3` | `#1a2230` | primary text |
| `--dim` | `#6c7a8d` | `#7a8699` | de-emphasized text |
| `--label` | `#8794a7` | `#5b6675` | panel labels |
| `--accent` | `#f5a623` | `#c77b00` | brand + active state (terminal amber) |
| `--gain` | `#2ebd85` | `#0f9d6b` | positive values |
| `--loss` | `#f6465d` | `#d61f3a` | negative values |
| `--grid` | `#16202c` | `#e3e8ef` | chart gridlines |

Light-theme accent/gain/loss are darkened so contrast stays ≥ 4.5:1 on the light bg.

## Type

- `--mono`: `ui-monospace, "JetBrains Mono", "IBM Plex Mono", Menlo, monospace`
  — ALL numbers (`font-variant-numeric: tabular-nums`), tickers, brand, labels.
- `--sans`: `Inter, system-ui, sans-serif` — descriptive copy, captions.
- Scale (px): 10 micro-label · 11 meta · 13 body/data · 14 stat value · 24 big chart value · 30 hero value.
- No body text below 13px except deliberate micro-labels (uppercase, tracked, label color).

## Spacing & layout

- 4px base grid: 4 / 8 / 12 / 16.
- Desktop: 3-column grid `248px | 1fr | 252px` (holdings | chart | stats), 36px top bar.
- Borders over shadows. Minimal chrome. Cards only when the card IS the interaction.

## Color semantics (accessibility — non-negotiable)

- **Gain/loss is NEVER color alone.** Always pair with direction glyph (▲/▼) and sign (+/−)
  so deuteranopia/protanopia users read the same data. The chart line uses gain/loss color
  AND the readout shows the arrow+sign.
- Body contrast ≥ 4.5:1 in both themes; large values ≥ 3:1.
- Chart colors are wired to theme tokens in JS (Lightweight Charts is themed via JS, not CSS):
  read the CSS vars and re-apply on theme switch.

## Interaction states (every panel)

| State | Holdings panel | Chart | Stats panel |
|-------|----------------|-------|-------------|
| First-run | sample portfolio pre-loaded (VOO/QQQ/BND) | renders sample growth | populated |
| Empty | warm prompt + prominent "+ add holding" | "Add a holding to see its growth" placeholder | dashes (—) |
| Loading | rows visible | skeleton chart + shimmer | shimmer values |
| Error: ticker not found | inline red note on the row | unaffected | unaffected |
| Error: prices.json fetch fail | — | full-panel message + Retry button | dashes |

First-run pre-loads a real sample so the screen is alive and teaching immediately.

## Responsive

- Desktop (≥1024px): 3-column terminal grid as above.
- Tablet (768–1023px): holdings collapses to a top strip; chart + stats side by side.
- Phone (<768px): **chart-first.** Big value + chart stay primary; holdings and stats
  become bottom tabs/sheets, one tap away. Not a naive vertical stack.
- Touch targets ≥ 44px. Keyboard: all inputs tabbable, visible focus ring (`--accent`).

## Forward projection cone (v2)

- **Color separates fact from model.** The factual past uses `--gain` (green); the modeled
  future uses `--accent` (amber). One glance distinguishes "what happened" from "what might."
- The cone is a filled 80% band (p10–p90) in translucent accent, a dashed accent median, and
  it emanates from the last real value so past and future read as one continuous chart.
- Rendered on Lightweight Charts with a band-mask technique: a p90 area (translucent accent
  fill) under a p10 area filled with the **solid** chart background, which erases everything
  below p10 and leaves the band. The chart background is therefore set solid (`--bg`), not
  transparent, so the mask matches exactly — re-applied on theme switch like the line colors.
- **Honesty over precision:** show a *range* ("80% range $X–$Y"), never a lone future number.
  The cone widening over time is the point. Scenarios (bear/base/bull) shift the mean only.

## Survivorship caveat (content)

Stats panel shows a persistent caveat: individual past-winner backtests overstate reality;
broad ETFs minimize it. Built into the UI, not hidden in docs.
