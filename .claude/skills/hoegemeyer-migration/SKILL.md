---
name: hoegemeyer-migration
description: >-
  Playbook for migrating hoegemeyer.com (AEM WCM Core Components) pages to this
  Edge Delivery Services / Document Authoring project. Use whenever migrating a
  new page, building/extending a block for it, or debugging why a migrated page
  doesn't match the live site. Encodes the concrete conventions, deltas, and
  gotchas learned migrating the header-nav and dropdown pages plus the homepage.
---

# Hoegemeyer → EDS Migration Playbook

This project migrates https://www.hoegemeyer.com/ (AEM WCM Core Components,
`cmp-*` classes) to AEM Edge Delivery Services, **Document Authoring (DA)**
project type. Content is authored/published in DA, not the repo; only block
code (`blocks/`), global CSS/JS (`styles/`, `scripts/`), and the `embeds/`
fragments are served from git. Follow this playbook so every migration matches
the live site on the first pass — "no back-and-forth changes."

## Golden rules

1. **Analyze and flag deltas up front.** Before building, scrape the live page,
   strip chrome, and list every block + variant it needs. Confirm each already
   exists in `blocks/`. Report any delta (missing block/variant, dynamic
   feature) to the user *before* writing code.
2. **Reuse existing blocks and infrastructure.** All common blocks exist:
   `breadcrumb, button, cards, carousel, columns, embed, fragment, teaser,
   widget`, plus header/footer. Shared transformers and parsers live in
   `tools/importer/`. Extend them; don't fork.
3. **Verify against the live site, not assumptions.** Measure with Playwright
   (`playwright_evaluate` for computed styles / DOM; screenshot only for
   pixel-level checks). Compare our render to `https://www.hoegemeyer.com/...`.
4. **Match the live site exactly** — fonts/weights, colours, spacing, full-bleed
   vs contained widths, image crops.

## The migration pipeline (per page)

The importer tooling lives under `tools/importer/` and is **git-ignored**
(local-only developer tooling; it never ships to the live site). Regenerate it
locally from this playbook. Steps:

1. **Scrape** the live page; strip `.globalheader`, `.globalfooter`,
   `.cmp-experiencefragment`, header/footer/scripts to see real content.
2. **Map** content flow in document order → which block each region is.
3. **Add a template** to `tools/importer/page-templates.json`: `{name, urls,
   blocks:[{name, instances:[selectors], section}]}`.
4. **Ensure parsers exist** in `tools/importer/parsers/` for each block and
   transformers in `tools/importer/transformers/`.
5. **Write** `tools/importer/import-<template>.js` (copy an existing one; swap
   parser registry, transformer list, and `PAGE_TEMPLATE`).
6. **Bundle + run** (scripts live in the excat-content-import skill dir):
   ```bash
   D="<excat-content-import>/scripts"
   bash "$D/aem-import-bundle.sh" --importjs tools/importer/import-<t>.js
   echo "<live-url>" > tools/importer/urls-<t>.txt
   node "$D/run-bulk-import.js" --import-script tools/importer/import-<t>.bundle.js --urls tools/importer/urls-<t>.txt
   ```
   Output lands in `content/<path>.plain.html` (also git-ignored).
7. **Verify** the generated `.plain.html` structure with cheerio/grep.
8. **Publish to DA** — wrap the fragment in a full document and POST it:
   ```bash
   { echo '<body>'; echo '<header></header>'; echo '<main>'; \
     cat content/<path>.plain.html; echo '</main>'; \
     echo '<footer></footer>'; echo '</body>'; } > /tmp/da.html
   curl -X POST -F "data=@/tmp/da.html;type=text/html" \
     "https://admin.da.live/source/<org>/<repo>/<path>.html"
   curl -X POST "https://admin.hlx.page/preview/<org>/<repo>/main/<path>"
   curl -X POST "https://admin.hlx.page/live/<org>/<repo>/main/<path>"
   ```
   **Uploading a bare `.plain.html` fragment renders empty** — always wrap in
   `<body><header></header><main>…</main><footer></footer></body>`.
   The homepage publishes to `index` but serves at `/` (`/index` 404s — normal).
9. **Verify live** with Playwright, then commit only the site-code changes
   (blocks/styles/scripts/embeds). Credentials for DA/hlx.page and git are
   injected automatically — never request or use a pasted token.

## Parser / transformer conventions (the gotchas)

- **Multi-part variants must be COMMA-joined** so EDS emits separate classes:
  `teaser (hero-l2, slim)` → `.hero-l2.slim`. A space collapses to one class
  (`hero-l2-slim`). Same for `columns (50-25-25, value-props)`.
- **Columns support arbitrary ratios** via the block's `data-ratio` →
  `--columns-template`. Just emit `columns (65-35)`, `columns (50-25-25)`, etc.
  The parser must collect content across the **whole column** (a column can
  stack several `.cmp-text`/`.cmp-image` blocks — e.g. two icon+text pairs);
  reading only the first `.cmp-text` drops content.
- **`value-props` variant**: columns whose cells stack image-over-caption items
  (≥2 imgs, no headings) — the parser detects this and adds `value-props`.
- **Buttonize solid CTAs**: source solid buttons are `<a><span class="c-button">`.
  That class is lost in the markdown round-trip, so wrap the link in `<strong>`
  → `decorateButtons()` promotes it to `a.button.primary`. Done in the columns
  parser (in-block) AND the cleanup transformer (standalone `.c-button`, e.g.
  "EXPLORE PRODUCTS"). Plain text-links (LEARN MORE →) stay links.
- **Strip the "opens in a new tab" a11y suffix** from external-link button
  labels (source injects a visually-hidden span that becomes visible text).
- **DM named crops**: teaser hero/banner images use Scene7 named crops
  (`…:Wide`, `:Large`, `:Medium`) via `<source srcset>`. The base `<img src>` is
  the raw uncropped asset (looks wrong / icon on grey). The teaser parser
  promotes the desktop `:Wide` rendition onto the `<img src>`.
- **Carousel video source**: YouTube (poster is a ytimg `…/vi/<id>/…` → watch
  URL) OR Dynamic Media (`data-video-url` → a `…/is/content/…` Scene7 video the
  carousel block plays as `type:'scene7'`). Prefer the DM URL when present.
- **`single-slide` galleries** nest inside `.galleryvideoplayer`; treat the whole
  gallery as one slide and dedupe by video id/URL. Carry a `non-bleed` outer
  class → emit `carousel (non-bleed)` (contained 1024px vs full-bleed default).

### Shared transformers (`tools/importer/transformers/hoegemeyer-*.js`)

- **cleanup**: strips `.globalheader/.globalfooter/.cmp-experiencefragment`,
  cookie band (`#consent_blackbar`, `[class*="truste"]`), stray
  `meta/source/noscript/link`. Keeps `.social-share` (hosts the breadcrumb).
  Also: **unwrap rich-text `<table>`s inside `.cmp-text`** (authored layout
  tables get misread as EDS blocks → a bogus 404-ing block); buttonize standalone
  `.c-button`.
- **dm-images**: rewrites DM `<img>`/anchors so Scene7/DM URLs round-trip; the
  client-side auto-block in `scripts/scripts.js` rebuilds responsive `<picture>`.
- **sections**: inserts `<hr>` section breaks + Section Metadata. Centred text
  groups get Style `text-center`; image-bearing text groups also get `logo`.

## Block CSS conventions

- **Full-bleed blocks** (teaser hero/banner, full-bleed carousel): zero the
  section wrapper gutters/max-width AND the section margin **and padding** via
  `main > .section:has(.teaser.block.banner) { margin:0; padding:0 }` — so a
  trailing full-bleed block sits flush against the footer (no white gap).
- **Empty trailing sections** (a metadata `<hr>` artifact) reserve a 40px margin
  → gap before the footer. `main > .section:empty { margin:0 }` collapses it.
- **`logo` section style** caps inline logo images (`max-width:300px`) — source
  logos have explicit `width` attrs lost in the round-trip, else they stretch to
  full column width.
- **Section text styles** (`text-center`, `text-left`, `text-large`,
  `text-x-large`, `logo`) replace the legacy `cmp-text--*` modifiers; authors add
  them via Section Metadata "Style" (combine with commas).

## Dynamic Media (Scene7) — critical

- URLs look like `assets.vylor.com/is/image/pioneer/…` (a vanity CNAME of
  Scene7; detect by the `/is/image/` path, not the host).
- **A `$preset$` param (e.g. `$galleryVideoPlayer_desktop$`) OWNS the image
  dimensions.** The DM auto-block in `scripts/scripts.js`
  (`buildScene7Rendition`) must NOT append `wid=` when a preset is present —
  doing so makes Scene7 fit the preset frame into a wider canvas and **pad the
  sides with grey**. Only override `fmt`.

## The `embed` block — third-party experiences (as-is markup)

`blocks/embed/embed.js` handles three authoring shapes:
1. **Local HTML fragment** (`href` ends `.html`, e.g. `/embeds/contact-us-form.html`):
   fetch it, inject, **re-create `<script>` nodes so they execute** (scripts
   injected via `innerHTML` are inert), and **rebind inline handlers**
   (`onsubmit="…"`) as `addEventListener` — EDS CSP blocks inline handlers.
   Used for the reCAPTCHA/Eloqua forms (Contact Us, Get Local Updates, Become a
   Dealer). Commit the exact `.cmp-embed` markup under `embeds/*.html`.
2. **Iframe embed** (locator/map/Ceros hero): builds a responsive `<iframe>`.
   An `?aspect=<ratio>` param locks a fixed aspect ratio (Ceros hero = 3.6).
3. **Raw pasted markup**: injected + scripts run.

## Known deltas / deferred

- **Dynamic article feed** (`cmp-article-filter` on News, Articles): fetches from
  a Corteva backend JSON API that won't exist post-migration. **Deferred** —
  decide per project: snapshot as static content, author an EDS JSON sheet /
  query-index, or expose a real API. The AEM servlet does NOT migrate; EDS has
  no app server — a block fetches from a chosen source client-side.
- **reCAPTCHA "Invalid domain for site key"**: the embedded forms' reCAPTCHA key
  is registered only for `hoegemeyer.com`. Client must add the EDS domain(s) to
  the key and allow cross-origin POSTs to `api-recaptcha.vylor.com`. Not a code
  fix.

## Branding tokens (styles/styles.css)

`--hoeg-navy:#375172; --hoeg-navy-hover:#459aff; --hoeg-surface:#f5f6f8;
--hoeg-ink:#20242d`. Headings use **Oswald Bold** (a distinct 700/800 family —
`fonts/OswaldBold.woff2`; single-weight Oswald 400 caused faux-bold). Body is
Oswald 400, 16px/24px. Content width standard is **1024px** centered.
</content>
