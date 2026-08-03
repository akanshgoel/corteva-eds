/*
 * Column control — ratio-driven, modeled on the legacy column control.
 *
 * A section's top wrapper (heading/intro) is authored as default content
 * before the block. The block itself is the "bottom wrapper": a single row of
 * cells whose widths are set by a ratio variant on the block, e.g.
 * "Columns (50-25-25)" or "Columns (25-25-25-25)". The ratio class can't drive
 * CSS grid directly (a class can't start with a digit), so it is parsed here
 * and applied as grid-template-columns. Mobile stacks; the ratio applies from
 * the tablet breakpoint up (handled in CSS via the data attribute hook).
 */

/** Reads a ratio variant class like "50-25-25" and returns [50,25,25]. */
function parseRatio(block) {
  const ratioClass = [...block.classList].find((c) => /^\d+(-\d+)+$/.test(c));
  if (!ratioClass) return null;
  return ratioClass.split('-').map(Number);
}

export default function decorate(block) {
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
}
