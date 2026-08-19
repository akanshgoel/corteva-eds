/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: fragment
 * Base block: fragment
 * Source: https://www.hoegemeyer.com/about.html  (.cmp-experiencefragment)
 * Generated: 2026-08-19
 *
 * Structure (fragment block content model):
 *   1-column block. The single cell holds a link to the fragment path. The
 *   fragment block fetches that path (`<path>.plain.html`) and inlines it.
 *
 * The source experience fragments are the global header and footer. We detect
 * which one this instance is (by its inner .globalheader / .globalfooter marker)
 * and point the fragment block at the corresponding fragment path.
 */
export default function parse(element, { document }) {
  // Map the experience fragment to its EDS fragment path.
  let path = null;
  let label = 'Fragment';
  if (element.querySelector('.globalheader, header')) {
    path = '/fragments/header';
    label = 'Header';
  } else if (element.querySelector('.globalfooter, footer')) {
    path = '/fragments/footer';
    label = 'Footer';
  }

  // Empty-block guard: no recognizable fragment role.
  if (!path) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const link = document.createElement('a');
  link.href = path;
  link.textContent = label;

  // Single-column block: one row, one cell holding the fragment link.
  const cells = [[[link]]];

  const block = WebImporter.Blocks.createBlock(document, { name: 'fragment', cells });
  element.replaceWith(block);
}
