/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: columns (column-control)
 * Base block: columns
 * Source: https://www.hoegemeyer.com/about.html
 *   Selectors: .column-control-cmp__wrapper--33-33-33, .column-control__wrapper--33-33-33,
 *              .column-control-cmp__wrapper--50-50
 * Generated: 2026-08-19
 *
 * Structure (from Columns block description):
 *   Multi-column block. Row 1 is the block name (+ ratio variant). Row 2 has one
 *   cell per column; each cell holds that column's content (image, heading, copy).
 *
 * The source ratio (33-33-33 or 50-50) is read from the wrapper's class and emitted
 * as the block variant so the correct column layout is preserved.
 */
export default function parse(element, { document }) {
  // Derive the ratio variant from the wrapper class (e.g. ...--33-33-33 / ...--50-50).
  let ratio = '';
  const cls = element.className || '';
  const ratioMatch = cls.match(/wrapper--([\d-]+)/);
  if (ratioMatch) ratio = ratioMatch[1];

  // Each direct .column-control__column becomes one column cell.
  const columns = Array.from(element.querySelectorAll(':scope > .column-control__column'));

  // Empty-block guard.
  if (!columns.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // For each column, collect its meaningful content nodes (images, headings, paragraphs).
  const row = columns.map((col) => {
    const contentCell = [];
    // Prefer the richtext content root; fall back to the column itself.
    const contentRoot = col.querySelector('.cmp-text') || col.querySelector('.richtext') || col;
    const nodes = Array.from(contentRoot.querySelectorAll('img, picture, h1, h2, h3, h4, h5, h6, p'))
      // Drop <p> that only wrap an image already captured (avoid duplication).
      .filter((n) => !(n.tagName === 'P' && n.querySelector('img, picture')));
    // Capture image-wrapping paragraphs' images directly, preserving order.
    const ordered = [];
    Array.from(contentRoot.querySelectorAll('img, picture, h1, h2, h3, h4, h5, h6, p')).forEach((n) => {
      if (n.tagName === 'P' && n.querySelector('img, picture')) {
        ordered.push(n.querySelector('picture') || n.querySelector('img'));
      } else if (nodes.includes(n)) {
        ordered.push(n);
      }
    });
    ordered.forEach((n) => contentCell.push(n));
    // Fallback: if nothing matched, keep the column's own children.
    if (!contentCell.length) contentCell.push(...contentRoot.childNodes);
    return contentCell;
  });

  const cells = [row];

  const name = ratio ? `columns (${ratio})` : 'columns';
  const block = WebImporter.Blocks.createBlock(document, { name, cells });
  element.replaceWith(block);
}
