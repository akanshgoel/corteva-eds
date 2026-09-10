/*
 * Table block — renders an authored data/comparison table.
 *
 * EDS turns a markdown table (or a rich-text `<table>` promoted during import)
 * into a block: `div.table > div (row) > div (cell)`. This decorator rebuilds
 * that grid into a semantic <table> so it renders as a real table (borders,
 * aligned columns) instead of stacked block cells. The first row becomes the
 * <thead> header (matching live, whose comparison tables have a bold header
 * row); the rest become <tbody> rows.
 *
 * Variants (block class): `no-header` skips the <thead> promotion.
 *
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  table.append(thead, tbody);

  const rows = [...block.children];
  const hasHeader = !block.classList.contains('no-header');

  rows.forEach((row, i) => {
    const tr = document.createElement('tr');
    const headerRow = hasHeader && i === 0;
    [...row.children].forEach((cell) => {
      const el = document.createElement(headerRow ? 'th' : 'td');
      if (headerRow) el.setAttribute('scope', 'col');
      el.innerHTML = cell.innerHTML;
      tr.append(el);
    });
    (headerRow ? thead : tbody).append(tr);
  });

  // If every row went to the body (no-header), drop the empty thead.
  if (!thead.children.length) thead.remove();

  block.replaceChildren(table);
}
