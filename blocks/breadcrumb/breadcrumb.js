/*
 * Breadcrumb block — Hoegemeyer.
 *
 * Faithfully reproduces the source site's embedded structure: the breadcrumb
 * is hosted inside a full-bleed navy "social-share" component (the source uses
 * data-component="social-share" data-module="Breadcrumb" purely as the band
 * that wraps the trail — no share icons). The trail itself is a schema.org
 * BreadcrumbList for SEO.
 *
 * Output DOM (preserved verbatim from the source):
 *   div.breadcrumb                              <- the block element
 *   └─ div.social-share [data-component][data-module]   navy full-bleed band
 *      └─ div.social-share-wrapper
 *         └─ div.social-share__breadcrumb
 *            └─ div.breadcrumb
 *               └─ nav.cmp-breadcrumb [aria-label][role]
 *                  └─ ol.cmp-breadcrumb__list.level-N [itemscope BreadcrumbList]
 *                     └─ li.cmp-breadcrumb__item × N   [itemscope ListItem]
 *                        ├─ a.cmp-breadcrumb__item-link > span[itemprop=name]  (linked crumb)
 *                        │   or  span[itemprop=name]                            (current crumb)
 *                        └─ meta[itemprop=position]
 *
 * Authoring — one crumb per row. Two content models are supported:
 *   1. Single cell per row: a link `[Homepage](/)` for a navigable crumb, or
 *      plain text for the current (non-linked) page. Example:
 *        | Breadcrumb                              |
 *        | [Homepage](https://www.hoegemeyer.com)  |
 *        | [The Dirt](/regional-expertise/articles)|
 *        | Bean Leaf Beetle Management in Soybeans |   <- plain text = current
 *   2. Two cells per row: `Label | url` (label in the first cell, destination
 *      in the second). Leave the second cell empty for the current page.
 *
 * Convention: the first crumb is normally "Homepage" and the last crumb is the
 * current page (authored as plain text, so it renders unlinked with
 * aria-current="page"). Every crumb before the last should be a link.
 *
 * Behaviour (all handled automatically — no author action needed):
 *   - Depth: the <ol> receives a `level-N` class (N = number of crumbs), e.g.
 *     `level-2`, `level-3`, matching the source markup. The name spans truncate
 *     with an ellipsis at depth-based caps (130ch / L2 70ch / L3 30ch / L4 20ch).
 *   - Responsive collapse: below 768px the trail collapses to just the parent
 *     crumb with a back-arrow (handled in CSS).
 *
 * Single visual style — the navy band — matching the source site, which has no
 * other breadcrumb variant.
 */

const SCHEMA = 'http://schema.org';

/**
 * Creates an element with a class name.
 * @param {string} tag element tag
 * @param {string} className class to apply
 * @returns {HTMLElement}
 */
function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

/**
 * Extracts the ordered list of crumbs from the authored block rows.
 * Handles both the single-cell (link or plain text) and two-cell
 * (label | url) authoring models.
 * @param {Element} block the block element
 * @returns {Array<{label: string, href: (string|null)}>}
 */
function extractCrumbs(block) {
  return [...block.children]
    .map((row) => {
      const cells = [...row.children];
      let label = '';
      let href = null;

      if (cells.length >= 2) {
        // Two-cell model: label | url
        label = cells[0].textContent.trim();
        const link = cells[1].querySelector('a');
        href = link ? link.getAttribute('href') : (cells[1].textContent.trim() || null);
      } else {
        // Single-cell model: a link (navigable) or plain text (current page)
        const cell = cells[0] || row;
        const link = cell.querySelector('a');
        label = cell.textContent.trim();
        href = link ? link.getAttribute('href') : null;
      }

      return { label, href };
    })
    .filter((crumb) => crumb.label);
}

/**
 * loads and decorates the breadcrumb
 * @param {Element} block The breadcrumb block element
 */
export default function decorate(block) {
  const crumbs = extractCrumbs(block);

  // No authored crumbs — render nothing rather than an empty band.
  if (!crumbs.length) {
    block.replaceChildren();
    return;
  }

  // schema.org BreadcrumbList; level-N mirrors the source depth class.
  const list = el('ol', `cmp-breadcrumb__list level-${crumbs.length}`);
  list.setAttribute('itemscope', '');
  list.setAttribute('itemtype', `${SCHEMA}/BreadcrumbList`);

  crumbs.forEach((crumb, i) => {
    const item = el('li', 'cmp-breadcrumb__item');
    item.setAttribute('itemprop', 'itemListElement');
    item.setAttribute('itemscope', '');
    item.setAttribute('itemtype', `${SCHEMA}/ListItem`);

    const name = el('span');
    name.setAttribute('itemprop', 'name');
    name.textContent = crumb.label;

    const isLast = i === crumbs.length - 1;

    if (crumb.href && !isLast) {
      // Navigable crumb (every crumb before the current page).
      const link = el('a', 'cmp-breadcrumb__item-link');
      link.setAttribute('itemprop', 'item');
      link.setAttribute('href', crumb.href);
      // Analytics hooks matching the source markup.
      link.setAttribute('data-analytics-type', 'global-breadcrumb');
      link.setAttribute('data-module-name', crumb.label);
      link.append(name);
      item.append(link);
    } else {
      // Current (non-linked) crumb — always plain text for the last item.
      item.append(name);
      item.setAttribute('aria-current', 'page');
    }

    const meta = el('meta');
    meta.setAttribute('itemprop', 'position');
    meta.setAttribute('content', String(i + 1));
    item.append(meta);

    list.append(item);
  });

  // Preserve the source's nested wrapper structure verbatim.
  const nav = el('nav', 'cmp-breadcrumb');
  nav.setAttribute('aria-label', 'Breadcrumb');
  nav.setAttribute('role', 'navigation');
  nav.append(list);

  const innerBreadcrumb = el('div', 'breadcrumb');
  innerBreadcrumb.append(nav);

  const shareBreadcrumb = el('div', 'social-share__breadcrumb');
  shareBreadcrumb.append(innerBreadcrumb);

  const shareWrapper = el('div', 'social-share-wrapper');
  shareWrapper.append(shareBreadcrumb);

  const socialShare = el('div', 'social-share');
  socialShare.setAttribute('data-component', 'social-share');
  socialShare.setAttribute('data-module', 'Breadcrumb');
  socialShare.append(shareWrapper);

  block.replaceChildren(socialShare);
}
