// eslint-disable-next-line import/no-unresolved
import {
  toClassName, buildBlock, decorateBlock, loadBlock,
} from '../../scripts/aem.js';

/*
 * Column control — ratio-driven, modeled on the legacy column control.
 *
 * A section's top wrapper (heading/intro) is authored as default content
 * before the block. The block itself is the "bottom wrapper": a single row of
 * cells whose widths are set by a ratio variant on the block, e.g.
 * "Columns (50-25-25)" or "Columns (25-25-25-25)". The ratio class can't drive
 * CSS grid directly (a class can't start with a digit), so it is parsed here
 * and applied as grid-template-columns. Cells stack on mobile/tablet; the ratio
 * applies at the desktop breakpoint (handled in CSS via the data attribute).
 *
 * A cell can hold a nested block — the products CARD GRID nests one
 * `teaser (card3)` per cell (live `cardscontainer.column_3_33_33_33`). EDS
 * auto-blocks only section-level tables, so it arrives as a raw <table>;
 * decorateNestedBlocks converts it (same approach as tabs.js).
 */

// Blocks that may nest inside a column cell (only teaser, for the card grid).
// A single-header table naming one of these is promoted to a real block; any
// other table (data grid, heading-named) is left untouched.
const NESTED_BLOCK_NAMES = new Set(['teaser']);

/** Reads a ratio variant class like "50-25-25" and returns [50,25,25]. */
function parseRatio(block) {
  const ratioClass = [...block.classList].find((c) => /^\d+(-\d+)+$/.test(c));
  if (!ratioClass) return null;
  return ratioClass.split('-').map(Number);
}

/**
 * Convert nested block tables inside a column cell into real blocks.
 *
 * Trigger: a single-header table naming a known block, optionally with a
 * parenthesised variant — "Teaser (card3)" → `teaser card3`. Multi-cell headers
 * (data tables) and unknown names are left as-is.
 * @param {Element} block the columns block element
 */
async function decorateNestedBlocks(block) {
  const tables = [...block.querySelectorAll('table')];
  await Promise.all(tables.map(async (table) => {
    if (!table.isConnected) return;
    const rows = [...table.querySelectorAll('tr')];
    if (!rows.length) return;

    const firstRowCells = [...rows[0].children];
    if (firstRowCells.length !== 1) return; // multi-cell header → data table
    const nameText = (firstRowCells[0].textContent || '').trim();
    if (!nameText) return;

    const baseName = toClassName(nameText.replace(/\(.*$/, '').trim());
    if (!NESTED_BLOCK_NAMES.has(baseName)) return; // unknown → leave as a table
    const variants = (nameText.match(/\(([^)]*)\)/g) || [])
      .map((tok) => toClassName(tok.slice(1, -1).trim()))
      .filter(Boolean);

    const bodyRows = rows.slice(1).map((tr) => [...tr.children].map((td) => {
      const cell = document.createElement('div');
      cell.innerHTML = td.innerHTML;
      return cell;
    }));

    const built = buildBlock(baseName, bodyRows);
    variants.forEach((v) => built.classList.add(v));
    table.replaceWith(built);
    decorateBlock(built);
    await loadBlock(built);
  }));
}

export default async function decorate(block) {
  const row = block.firstElementChild;
  const cols = [...row.children];
  block.classList.add(`columns-${cols.length}-cols`);
  block.style.setProperty('--columns-count', cols.length);

  // apply the authored ratio (bottom wrapper), if present
  const ratio = parseRatio(block);
  if (ratio && ratio.length === cols.length) {
    block.dataset.ratio = ratio.join('-');
    block.style.setProperty('--columns-template', ratio.map((r) => `${r}fr`).join(' '));
  }

  // setup image columns
  [...block.children].forEach((r) => {
    [...r.children].forEach((col) => {
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

  // Column-feature panels (granular-insights Log In / VRS): a 50-50 columns with
  // an image column, whose text cell opens with a short eyebrow <p> followed by a
  // heading. Live renders that eyebrow+heading beside a 5px navy accent bar. The
  // authoring markdown flattens the source wrapper, so re-group the eyebrow +
  // heading here into a `.column-feature-title` div and tag the block so
  // columns.css can draw the accent bar + align the copy. Purely presentational.
  if (block.dataset.ratio === '50-50' && block.querySelector('.columns-img-col')) {
    const textCell = [...(block.firstElementChild?.children || [])]
      .find((c) => !c.classList.contains('columns-img-col') && !c.querySelector('picture'));
    const first = textCell && textCell.firstElementChild;
    // The title group is an optional short eyebrow <p> followed by a heading, OR
    // a heading on its own (the VRS panel has no eyebrow). The accent bar sits
    // beside whichever leads the cell.
    const isEyebrow = first && first.tagName === 'P'
      && (first.textContent || '').trim().length <= 40 && !first.querySelector('a');
    const heading = isEyebrow ? first.nextElementSibling : first;
    const isHeading = heading && /^H[1-6]$/.test(heading.tagName);
    if (isHeading) {
      const titleGroup = document.createElement('div');
      titleGroup.className = 'column-feature-title';
      first.before(titleGroup);
      if (isEyebrow) titleGroup.append(first, heading);
      else titleGroup.append(heading);
      block.classList.add('column-feature');
    }
  }

  // promote any nested block tables in cells (e.g. the card-grid teasers)
  await decorateNestedBlocks(block);
}
