/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: teaser (hero-l2)
 * Base block: teaser
 * Source: https://www.hoegemeyer.com/about.html  (.teaser.cmp-teaser--hero-l2)
 * Generated: 2026-08-19
 *
 * Structure (from teaser block content model):
 *   1-column block. Rows carry the background image and the title.
 *   hero-l2 = full-bleed image with a white title overlaid at the bottom.
 */
export default function parse(element, { document }) {
  // Background image — delivered as an optimized <picture> or a bare <img>.
  const image = element.querySelector('.cmp-teaser__image picture, .cmp-teaser__image img, picture, img');
  // Title heading.
  const heading = element.querySelector('.cmp-teaser__title, h1, h2, h3, h4, h5, h6');

  // Empty-block guard: nothing meaningful to migrate.
  if (!image && !heading) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];
  // teaser is a single-column block: background image on its own row,
  if (image) cells.push([image]);
  // title on its own row.
  if (heading) cells.push([heading]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'teaser (hero-l2)', cells });
  element.replaceWith(block);
}
