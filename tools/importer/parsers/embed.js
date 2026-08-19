/* eslint-disable */
/* global WebImporter */
/**
 * Parser for the embed block (cmp-embed).
 * Source: https://www.hoegemeyer.com/about/find-a-rep.html
 *   Selector: .cmp-embed (holds a Bullseye store-locator <iframe> + resize script)
 *
 * Follows the EDS Embed convention: the block table has 1 column; row 1 is the
 * block name (+ variant) and the following row is a single cell containing a
 * link to the external content to embed. Raw iframe markup does not survive the
 * Document Authoring markdown round-trip, so we emit the iframe's src as a link
 * and let the runtime embed.js rebuild a responsive <iframe> from it.
 */
export default function parse(element, { document }) {
  const iframe = element.querySelector('iframe[src]');
  if (!iframe) {
    // Nothing embeddable — drop the (script-only) node.
    element.remove();
    return;
  }

  const src = iframe.getAttribute('src');
  const title = iframe.getAttribute('title') || 'Embedded content';

  const link = document.createElement('a');
  link.href = src;
  link.textContent = title;

  // Row 1: block name (+ full-width variant). Row 2: single cell with the link.
  const cells = [[link]];
  const block = WebImporter.Blocks.createBlock(document, { name: 'embed (full-width)', cells });
  element.replaceWith(block);
}
