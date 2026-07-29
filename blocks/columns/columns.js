import { decorateBlock, loadBlock } from '../../scripts/aem.js';

/*
 * Converts a nested block authored as a table (e.g. a Cards block inside a
 * Columns cell) into the block div structure EDS expects. The pipeline only
 * auto-converts top-level tables, so nested ones arrive here as raw <table>.
 */
function tableToBlock(table) {
  const rows = [...table.querySelectorAll(':scope > tbody > tr, :scope > tr')];
  if (!rows.length) return null;
  const nameText = rows[0].textContent.trim();
  const match = nameText.match(/^([^(]+)(?:\(([^)]*)\))?/);
  if (!match) return null;
  const name = match[1].trim().toLowerCase();
  const variants = match[2] ? match[2].split(/[\s,]+/).map((v) => v.trim().toLowerCase()) : [];
  const blockEl = document.createElement('div');
  blockEl.className = [name, ...variants].filter(Boolean).join(' ');
  rows.slice(1).forEach((tr) => {
    const rowDiv = document.createElement('div');
    [...tr.children].forEach((td) => {
      const cell = document.createElement('div');
      while (td.firstChild) cell.append(td.firstChild);
      rowDiv.append(cell);
    });
    blockEl.append(rowDiv);
  });
  return blockEl;
}

export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  // setup image columns
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          // picture is only content in column
          picWrapper.classList.add('columns-img-col');
        }
      }
    });
  });

  // convert any nested block authored as a table into a real block element
  block.querySelectorAll(':scope table').forEach((table) => {
    const nested = tableToBlock(table);
    if (nested) table.replaceWith(nested);
  });

  // decorate + load any nested blocks (e.g. a Cards block inside a column cell),
  // which the top-level decorateBlocks pass does not reach
  block.querySelectorAll(':scope div[class]').forEach((nested) => {
    if (nested.dataset.blockStatus || nested.classList.contains('columns-img-col')) return;
    decorateBlock(nested);
    loadBlock(nested);
  });
}
