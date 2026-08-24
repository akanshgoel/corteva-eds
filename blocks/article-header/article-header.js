/*
 * Article Header block — Hoegemeyer.
 *
 * Faithful reproduction of the source site's AEM "articleheader" component
 * (article-header--variant1) — the header on every article and news page.
 * Every live instance is variant1; it appears in three content patterns:
 *   1. title only
 *   2. publish date (bold, above) + title
 *   3. date + title + a full-width banner image below
 *
 * Output DOM (class names mirror the source so styling maps 1:1):
 *   .article-header (block) .article-header--variant1
 *   ├─ .article-header__section
 *   │  ├─ .article-header__page-details             (always present)
 *   │  │  └─ .article-header__other-info-container   (only when a date is set)
 *   │  │     └─ .article-header__other-info           the date
 *   │  └─ .article-header__main__content
 *   │     └─ .title
 *   │        └─ .cmp-title
 *   │           └─ h1.cmp-title__text                 the title
 *   └─ <picture>/<img.article-header__image>          (only when an image is set)
 *
 * Authoring (block name: Article Header). Cells detected by content, order
 * flexible:
 *   - Title : text (or a heading) — REQUIRED. Becomes the <h1>.
 *   - Date  : a short date like "3/31/2025" — OPTIONAL. Shown above the title.
 *   - Image : an image — OPTIONAL. Full-width banner below the header.
 * One row per piece, or a single row with multiple cells.
 */

const DATE_RE = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;

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
  return cells.filter((c) => c.textContent.trim() || c.querySelector('img, picture'));
}

/**
 * loads and decorates the article header
 * @param {Element} block The article-header block element
 */
export default function decorate(block) {
  block.classList.add('article-header--variant1');

  const cells = getCells(block);

  // Classify cells: image (has picture/img), date (date-shaped text), title.
  const imageCell = cells.find((c) => c.querySelector('img, picture')) || null;
  const rest = cells.filter((c) => c !== imageCell);
  const dateCell = rest.find((c) => DATE_RE.test(c.textContent.trim())) || null;
  const titleCell = rest.find((c) => c !== dateCell) || null;

  const titleText = titleCell ? titleCell.textContent.trim() : '';
  const dateText = dateCell ? dateCell.textContent.trim() : '';

  // ----- header section -----
  const section = document.createElement('div');
  section.className = 'article-header__section';

  // page-details (always present; holds the date when authored)
  const details = document.createElement('div');
  details.className = 'article-header__page-details';
  if (dateText) {
    const infoContainer = document.createElement('div');
    infoContainer.className = 'article-header__other-info-container';
    const info = document.createElement('div');
    info.className = 'article-header__other-info';
    info.textContent = dateText;
    infoContainer.append(info);
    details.append(infoContainer);
  }
  section.append(details);

  // main content — the title
  const main = document.createElement('div');
  main.className = 'article-header__main__content';
  const titleWrap = document.createElement('div');
  titleWrap.className = 'title';
  const cmpTitle = document.createElement('div');
  cmpTitle.className = 'cmp-title';
  const authoredHeading = titleCell && titleCell.querySelector('h1,h2,h3,h4,h5,h6');
  const h = document.createElement(authoredHeading ? authoredHeading.tagName : 'h1');
  h.className = 'cmp-title__text';
  h.textContent = titleText;
  cmpTitle.append(h);
  titleWrap.append(cmpTitle);
  main.append(titleWrap);
  section.append(main);

  const children = [section];

  // ----- optional banner image (full width, below the header) -----
  if (imageCell) {
    const pic = imageCell.querySelector('picture');
    if (pic) {
      const img = pic.querySelector('img');
      if (img) img.classList.add('article-header__image');
      children.push(pic);
    } else {
      const img = imageCell.querySelector('img');
      if (img) {
        img.classList.add('article-header__image');
        children.push(img);
      }
    }
  }

  block.replaceChildren(...children);
}
