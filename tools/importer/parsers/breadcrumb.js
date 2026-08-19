/* eslint-disable */
/* global WebImporter */
/**
 * Parser for block: breadcrumb
 * Source: https://www.hoegemeyer.com/about.html  (.social-share .cmp-breadcrumb)
 *
 * The source breadcrumb is a schema.org BreadcrumbList: one <li> per crumb,
 * navigable crumbs carry an <a>, the current (last) crumb is plain text. The
 * breadcrumb block's model is one crumb per row — a link for navigable crumbs,
 * plain text for the current page.
 */
export default function parse(element, { document }) {
  // The block instance is the .social-share wrapper; the trail is inside it.
  const nav = element.querySelector('.cmp-breadcrumb') || element;
  const items = [...nav.querySelectorAll('.cmp-breadcrumb__item')];

  const rows = [];
  items.forEach((li) => {
    const link = li.querySelector('a[href]');
    const name = (li.querySelector('[itemprop="name"]') || li).textContent.trim();
    if (!name) return;
    if (link) {
      const a = document.createElement('a');
      a.href = link.getAttribute('href');
      a.textContent = name;
      rows.push([a]);
    } else {
      // Current page — plain text (no link).
      rows.push([name]);
    }
  });

  if (!rows.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'breadcrumb', cells: rows });
  element.replaceWith(block);
}
