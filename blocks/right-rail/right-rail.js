/*
 * Right Rail block — Hoegemeyer.
 *
 * Faithful reproduction of the source site's AEM "rightrail" component
 * (.cmp-right-rail), the promo/aside module used on article and news pages.
 * It stacks, in order:
 *   - a bold separator (the source's cmp-separator--bold)
 *   - an <h4> title
 *   - a text block containing a CTA styled as a "c-button"
 *
 * Output DOM (class names mirror the source so styling maps 1:1):
 *   .right-rail (block)
 *   └─ .cmp-right-rail
 *      ├─ .separator.cmp-separator--bold
 *      │  └─ .cmp-separator
 *      │     └─ hr.cmp-separator__horizontal-rule
 *      ├─ .title
 *      │  └─ .cmp-title
 *      │     └─ h4.cmp-title__text
 *      └─ .text.cmp-text--medium.cmp-text--left
 *         └─ .cmp-text
 *            └─ p > a > span.c-button      (the CTA)
 *
 * Authoring (block name: Right Rail). Cells detected by content, order flexible:
 *   - Title : text (or a heading) — becomes the <h4>. REQUIRED.
 *   - Body  : optional paragraph(s) of copy shown above the CTA.
 *   - CTA   : a link — rendered as the c-button. Optional.
 * One row per piece, or a single row with multiple cells. The leading bold
 * separator is always rendered (matching every live instance).
 */

/**
 * Creates an element with an optional class and text.
 * @param {string} tag
 * @param {string} [className]
 * @returns {HTMLElement}
 */
function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

/**
 * Collects the block's non-empty leaf cells, in document order.
 * @param {Element} block
 * @returns {Element[]}
 */
function getCells(block) {
  const cells = [];
  [...block.children].forEach((row) => {
    const rowCells = [...row.children];
    if (rowCells.length) cells.push(...rowCells);
    else cells.push(row);
  });
  return cells.filter((c) => c.textContent.trim() || c.querySelector('img, picture, a'));
}

/**
 * Builds the leading bold separator (source: separator.cmp-separator--bold).
 * @returns {HTMLElement}
 */
function buildSeparator() {
  const sep = el('div', 'separator cmp-separator--bold');
  const inner = el('div', 'cmp-separator');
  inner.append(el('hr', 'cmp-separator__horizontal-rule'));
  sep.append(inner);
  return sep;
}

/**
 * loads and decorates the right rail
 * @param {Element} block The right-rail block element
 */
export default function decorate(block) {
  const cells = getCells(block);

  // Identify the CTA (a cell whose only meaningful content is a link) and the
  // title (first heading, or first text cell that isn't the CTA).
  const ctaCell = cells.find((c) => {
    const a = c.querySelector('a');
    return a && a.textContent.trim() === c.textContent.trim();
  }) || null;
  const rest = cells.filter((c) => c !== ctaCell);
  const titleCell = rest.find((c) => c.querySelector('h1,h2,h3,h4,h5,h6'))
    || rest[0] || null;
  const bodyCells = rest.filter((c) => c !== titleCell);

  const container = el('div', 'cmp-right-rail');

  // 1. bold separator (always present, as on the source)
  container.append(buildSeparator());

  // 2. title -> h4
  if (titleCell) {
    const titleWrap = el('div', 'title');
    const cmpTitle = el('div', 'cmp-title');
    const heading = titleCell.querySelector('h1,h2,h3,h4,h5,h6');
    const h = el('h4', 'cmp-title__text');
    h.textContent = (heading ? heading.textContent : titleCell.textContent).trim();
    cmpTitle.append(h);
    titleWrap.append(cmpTitle);
    container.append(titleWrap);
  }

  // 3. text block — optional body copy + the CTA as a c-button
  const hasText = bodyCells.length || ctaCell;
  if (hasText) {
    const text = el('div', 'text cmp-text--medium cmp-text--left');
    const cmpText = el('div', 'cmp-text');

    bodyCells.forEach((c) => {
      // Move authored paragraphs/markup through verbatim.
      [...c.childNodes].forEach((n) => cmpText.append(n.cloneNode(true)));
    });

    if (ctaCell) {
      const a = ctaCell.querySelector('a');
      const p = el('p');
      const link = el('a');
      link.href = a.getAttribute('href');
      if (a.title) link.title = a.title;
      const span = el('span', 'c-button');
      span.textContent = a.textContent.trim();
      link.append(span);
      p.append(link);
      cmpText.append(p);
    }

    text.append(cmpText);
    container.append(text);
  }

  block.replaceChildren(container);
}
