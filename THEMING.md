# Multi-Brand Theming

This project runs the **same set of blocks for multiple brands** (e.g.
hoegemeyer, corteva) that differ only in **colors and fonts**. Each brand is on
its own domain with its own authoring. Everything structural — font *sizes*,
padding, margin, width/height, breakpoints, radii, layout — is shared and
identical across brands.

> Full implementation guide, phases, and guardrails live in the
> [`multi-brand-theming` skill](.claude/skills/multi-brand-theming/SKILL.md).
> This file is the short human-facing summary.

## How it works

- **One shared codebase** — all brands use the same `blocks/`, `scripts/`,
  `styles/`. A brand adds only a theme file + its content source + domain.
- **Semantic CSS custom-property tokens** — colors and font *families* are CSS
  variables in `styles/styles.css` `:root`; a brand overrides only the values.
- **Config-value theme resolution** — each brand's authoring sets a `theme`
  value; `scripts.js` adds `<body class="theme-<brand>">` and lazy-loads
  `styles/themes/<brand>.css`. (Not hostname-based, so previews work.)

## How the `theme` value reaches the page

`scripts.js` reads it with `getMetadata('theme')`, which returns the content of a
`<meta name="theme">` tag in the page `<head>`. EDS produces that meta tag from
**page metadata**, so a brand sets it in its authoring (NOT in this repo):

- **Recommended: bulk `metadata.xlsx`** at the root of the brand's content source
  (DA mountpoint) — one rule applies the theme to every page:

  | URL  | theme    |
  |------|----------|
  | `/**` | `corteva` |

  EDS injects `<meta name="theme" content="corteva">` into every page of that
  site. Set once per brand; no per-page work. `metadata.xlsx` lives in the
  brand's content bus, so each brand carries its own value in isolation.
- Alternatively, a per-page **Metadata block** row (`Theme | corteva`) sets it
  for a single page (the importer can auto-inject this per brand).

The default brand (hoegemeyer) needs **no** metadata — the resolver falls back to
`hoegemeyer` and the `:root` defaults, so existing pages are unaffected.

## The token contract

| Varies per brand (tokenized) | Shared (literal, never duplicated) |
|------------------------------|------------------------------------|
| all colors, font families    | font sizes, padding, margin, width/height, breakpoints, radii, layout |

Semantic tokens (defaults = current hoegemeyer values, so nothing changes):

```css
:root {
  --color-brand-primary: #375172;
  --color-brand-primary-hover: #459aff;
  --color-ink: #20242d;
  --color-surface: #f5f6f8;
  --color-border: #d6d9de;
  --font-heading: 'Oswald Bold', oswald, sans-serif;
  --font-body: oswald, sans-serif;
}
```

## Adding a brand (e.g. corteva)

1. Create `styles/themes/corteva.css` overriding the color tokens (blue→red)
   and `--font-*`.
2. Add corteva's fonts to `fonts/`.
3. Wire corteva's content source (`fstab.yaml` / DA mountpoint) and production
   domain; set `theme=corteva` in its config.
4. **No block changes** — corteva inherits all sizes/spacing/layout; only the
   ~30 token values differ.

## Status

Planned, not yet implemented. The blocks still contain ~122 hardcoded brand
colors that must first be tokenized (Phase 1 in the skill). Recommended first
step: a small proof (tokenize `card` + `button`, add a sample corteva theme) to
validate the mechanism before tokenizing all blocks.
