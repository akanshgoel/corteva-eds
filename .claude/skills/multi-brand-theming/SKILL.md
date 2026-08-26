---
name: multi-brand-theming
description: >-
  Plan and implementation guide for multi-brand theming in this EDS project —
  running the same blocks for multiple brands (e.g. hoegemeyer, corteva) that
  differ only in colors and fonts, each on its own domain and authoring. Use
  when adding a new brand, tokenizing a block's colors/fonts, or wiring the
  runtime theme resolver. Encodes the decided architecture: one shared repo,
  semantic CSS custom-property tokens, config-value theme resolution.
---

# Multi-Brand Theming

Multiple brands run the **same set of blocks**; only **colors and fonts** differ.
Everything structural — font *sizes*, padding, margin, width/height, breakpoints,
radii, layout — is identical across brands and must NOT be duplicated.

Example: a card is navy (`#375172`) for hoegemeyer but red for corteva. Every
brand-blue occurrence recolors from one small theme file; no block is edited.

## Decided architecture

- **One shared codebase.** All brands use the same `blocks/`, `scripts/`,
  `styles/`. A brand = one theme file + its own content source + domain.
- **Semantic CSS custom-property tokens.** Colors and font *families* are CSS
  variables; brands override only the values.
- **Config-value theme resolution.** Each brand's authoring sets a `theme`
  value (site metadata/config). `scripts.js` reads it, adds
  `<body class="theme-<brand>">`, and lazy-loads `styles/themes/<brand>.css`.
  Domain-independent and previewable (do NOT hardcode by hostname).

## The token contract

Split every value into two buckets:

| Varies per brand (tokenize) | Shared (leave as literals) |
|-----------------------------|----------------------------|
| all colors, font *families* | font *sizes*, padding, margin, width/height, breakpoints, radii, layout |

Semantic token names live in `styles/styles.css` `:root`, with hoegemeyer's
current values as the defaults so the live site is unchanged:

```css
:root {
  --color-brand-primary: #375172;        /* was --hoeg-navy */
  --color-brand-primary-hover: #459aff;  /* was --hoeg-navy-hover */
  --color-ink: #20242d;                  /* was --hoeg-ink (body text) */
  --color-surface: #f5f6f8;              /* was --hoeg-surface */
  --color-border: #d6d9de;
  --font-heading: 'Oswald Bold', oswald, sans-serif;
  --font-body: oswald, sans-serif;
}
```

Rename rather than keep `--hoeg-*` so tokens read correctly for any brand.

## Current state (audit before you start)

As of writing, the project is **NOT yet tokenized**: ~122 hardcoded brand colors
live across `blocks/*/*.css` (navy `#375172` ×28, ink `#20242d` ×15, `#459aff`
×8, `#f5f6f8`, borders …), and existing tokens are brand-named (`--hoeg-*`).
Re-audit before implementing:

```bash
# count remaining hardcoded colors in blocks (goal: 0 brand colors)
grep -rhoiE "#[0-9a-f]{3,8}\b|rgb\(|rgba\(" blocks/*/*.css | grep -viE "var\(" | wc -l
# per-block breakdown
for b in blocks/*/; do n=$(grep -rhoiE "#[0-9a-f]{3,8}\b|rgb\(" "$b"*.css 2>/dev/null | wc -l); [ "$n" -gt 0 ] && echo "$(basename $b): $n"; done
# where a specific brand hex is used
grep -rn "#375172" blocks/*/*.css styles/*.css
```

## Implementation phases

### Phase 1 — Tokenize (one-time, the bulk of the work)
1. Define the semantic token set in `:root` (values = current hoegemeyer hex).
2. Replace hardcoded colors in every `blocks/*/*.css` + `styles/*.css` with
   `var(--token)`. **Audit each hex** — incidental non-brand values (pure-black
   overlays `rgb(0 0 0 / 40%)`, pure `#fff` on media, shadows) usually stay
   literal; only brand colors tokenize.
3. Tokenize font *families* to `--font-*`. Leave all font *sizes* alone.
4. **Verify hoegemeyer renders identically** to current live after each block
   (Playwright computed-style checks; the defaults mean zero visual change).

### Phase 2 — Theme delivery
1. `styles/themes/hoegemeyer.css` — the reference theme:
   `.theme-hoegemeyer { --color-brand-primary: #375172; … }` + its `@font-face`s.
2. `scripts.js` resolver (~20 lines), in the eager phase before first paint:
   read the `theme` config (fall back to a default), set
   `document.body.classList.add('theme-<brand>')`, and `loadCSS` the theme file.
   Reuse the existing `decorateTemplateAndTheme` hook rather than adding a new one.
3. Fonts: each brand ships its own woff2 in `fonts/` and its `@font-face` set.

### Phase 3 — Onboard a brand (e.g. corteva)
1. `styles/themes/corteva.css` — override color tokens (blue→red) + `--font-*`.
2. Add corteva's fonts to `fonts/`.
3. Wire corteva's content source (`fstab.yaml` / DA mountpoint) and production
   domain.
4. **Set the `theme` metadata** so `getMetadata('theme')` returns `corteva`.
   `scripts.js` reads a `<meta name="theme">` tag, which EDS produces from page
   metadata. Recommended: a **`metadata.xlsx`** at the root of corteva's content
   source (NOT this repo) with one rule that themes every page:

   | URL  | theme    |
   |------|----------|
   | `/**` | `corteva` |

   (Or a per-page Metadata-block `Theme | corteva` row; the importer can
   auto-inject it per brand.) The default brand (hoegemeyer) needs no metadata —
   the resolver falls back to `hoegemeyer` + the `:root` defaults.
5. **Zero block edits** — corteva inherits all sizes/spacing/layout; only the
   ~30 token values differ.

## Build order (recommended)
Token audit/rename → **small proof first** (tokenize `card` + `button`, add a
sample `corteva` theme, confirm recolor with no block edits) → tokenize the
remaining blocks block-by-block with visual verification → theme loader +
hoegemeyer reference theme → onboard corteva for real.

## Guardrails
- Never tokenize structure (sizes/spacing/layout) — those are shared.
- Keep hoegemeyer defaults in `:root` so an un-themed load still looks right.
- One block, one set of tokens: fix a block once, all brands benefit.
- Verify each tokenized block against the live hoegemeyer render before moving on.
- Relate to [[hoegemeyer-migration]] for how blocks/CSS are structured here.
