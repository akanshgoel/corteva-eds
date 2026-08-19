/* eslint-disable */
/* global WebImporter */
/**
 * Parser for block: teaser (variant-aware)
 * Source: hoegemeyer cmp-teaser components.
 *
 * Reads the variant from the source class (cmp-teaser--<variant>) and maps it to
 * the teaser block's variant classes:
 *   cmp-teaser--hero-l1[/--slim]  → "hero-l1" [+ "slim"]
 *   cmp-teaser--hero-l2[/--slim]  → "hero-l2" [+ "slim"]
 *   cmp-teaser--banner            → "banner"
 *   cmp-teaser--card2/3/7         → "card2" / "card3" / "card7"
 *
 * Content model (matches blocks/teaser/teaser.js decoration):
 *   row 1: image (background/poster)
 *   row 2: heading (title)
 *   row 3: description paragraph(s)   — when present (banner/card/hero-l1)
 *   row 4: CTA link                    — when present (banner/card)
 * Simple variants (hero-l2) only author image + title.
 */

function variantOf(element) {
  const cls = element.className || '';
  const mods = (cls.match(/cmp-teaser--[a-z0-9-]+/g) || [])
    .map((m) => m.replace('cmp-teaser--', ''));
  // Normalize: base variant first, then modifiers like "slim".
  // Note the source expresses slim as its own class `cmp-teaser--hero-l2--slim`,
  // so the captured token is e.g. "hero-l2--slim" — detect slim by suffix.
  const parts = [];
  const base = mods.find((m) => /^(hero-l1|hero-l2|banner|card2|card3|card7)$/.test(m));
  if (base) parts.push(base);
  if (mods.some((m) => m === 'slim' || m.endsWith('--slim'))) parts.push('slim');
  // Comma-separate so EDS renders each as its own block class (e.g.
  // `hero-l2` + `slim`), matching the block CSS selector `.hero-l2.slim`.
  // A space would collapse to a single hyphenated class (`hero-l2-slim`).
  return parts.join(', ');
}

export default function parse(element, { document }) {
  const image = element.querySelector('.cmp-teaser__image picture, .cmp-teaser__image img, picture, img');
  const heading = element.querySelector('.cmp-teaser__title, h1, h2, h3, h4, h5, h6');
  const descEl = element.querySelector('.cmp-teaser__description');
  const cta = element.querySelector('.cmp-teaser__action-link, .cmp-teaser__action-container a, a');

  if (!image && !heading) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];
  if (image) cells.push([image]);
  if (heading) {
    // Emit a clean heading (strip nested wrapper markup, keep text).
    const h = document.createElement(heading.tagName.match(/^H[1-6]$/i) ? heading.tagName : 'h2');
    h.textContent = heading.textContent.trim();
    cells.push([h]);
  }
  if (descEl && descEl.textContent.trim()) {
    const p = document.createElement('p');
    p.textContent = descEl.textContent.trim();
    cells.push([p]);
  }
  if (cta && cta.getAttribute('href')) {
    const a = document.createElement('a');
    a.href = cta.getAttribute('href');
    a.textContent = cta.textContent.trim() || a.href;
    cells.push([a]);
  }

  const variant = variantOf(element);
  const name = variant ? `teaser (${variant})` : 'teaser';
  const block = WebImporter.Blocks.createBlock(document, { name, cells });
  element.replaceWith(block);
}
