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

## Content layout: separate sites, no brand folders

Each brand is its **own EDS site** — its own content source and domain — sharing
**this one code repo**. Pages stay at the **root** of each brand's content source
(e.g. `hoegemeyer.com/about/history`, `corteva.com/about/history`). The brand
boundary is the **domain + content source, not a folder**, so there is no
nesting (never `/hoegemeyer/about/history`) and no URL migration. One repo backs
many sites → fix a block once, every brand gets it.

## Adding a brand (in this repo)

Code/content side (in this repo — safe to do anytime):
1. Create `styles/themes/<brand>.css` overriding the color tokens (e.g. blue→red)
   and `--font-*`.
2. Add the brand's fonts to `fonts/` and reference them in the theme file.

Provisioning side (external tools — needs Adobe org access; the injected publish
credentials can *read* the Config Service but provisioning is done by an admin):

A site is defined by an **org + site name** via the **Config Service** — it is
NOT tied 1:1 to a repo, which is exactly why one repo backs many sites. Two
surfaces:
- **Web UI:** `https://tools.aem.live` (the real browsable admin tool).
- **API:** the Admin service `admin.hlx.page` — API ONLY. Its bare URL returns
  404; it answers routes like `/preview`, `/status`, and `/config/...`. It is
  NOT a website.

3. **Create the brand's DA content space first** — a new Document Authoring
   space at `content.da.live/<org>/<brand>/` (e.g. `…/corteva/`). The site config
   points at this, so it must exist before step 4.
4. **Register the site** (via `tools.aem.live`, or a `PUT` to
   `admin.hlx.page/config/<org>/sites/<brand>.json`). Reuse the SAME code repo
   and bind the brand's content source. Reference — current hoegemeyer config:
   ```json
   {
     "code":    { "source": { "type": "github",
                              "url": "https://github.com/akanshgoel/corteva-eds" },
                  "owner": "akanshgoel", "repo": "corteva-eds" },
     "content": { "source": { "url": "https://content.da.live/akanshgoel/corteva-eds/",
                              "type": "markup" } }
   }
   ```
   For the new brand, keep `code` identical; change only `content.source.url` to
   the brand's DA space. Live immediately at `main--<site>--<owner>.aem.page`.
   (AEM Code Sync `github.com/apps/aem-code-sync` is already installed on the repo.)
5. **Theme metadata.** Add `metadata.xlsx` at the brand content-source root with
   one rule so every page themes: `URL: /**`, `theme: <brand>` → EDS emits
   `<meta name="theme" content="<brand>">`, which `scripts.js` reads.
6. **Domain.** Attach the production hostname (e.g. `corteva.com`) + DNS.
7. **No block/code edits** — the brand inherits all sizes/spacing/layout; only
   the ~30 token values differ, applied via `body.theme-<brand>`.

The default brand (hoegemeyer) is already live at root with no `theme` metadata
(the resolver falls back to `hoegemeyer`).

## Status

**Implemented and on main.** All blocks are tokenized (zero hardcoded brand
colors), the `scripts.js` theme resolver is live (defaults to `hoegemeyer`), and
`styles/themes/{hoegemeyer,corteva}.css` exist. Hoegemeyer renders unchanged;
`body.theme-corteva` recolors to red with no block edits (verified).

Remaining per brand (done when the brand's site is provisioned): create its
`styles/themes/<brand>.css` with real brand colors/fonts, and complete the
external provisioning steps above (site config, content source, `metadata.xlsx`,
domain). The `corteva.css` in the repo is a placeholder-red proof — swap for the
official palette/fonts.
