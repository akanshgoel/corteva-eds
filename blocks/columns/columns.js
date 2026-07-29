/*
 * Groups the flat image+text pairs the pipeline delivers in a column cell into
 * discrete value-prop items (icon over text). Used by the "value-props" variant
 * so a Columns block can render a map beside a 2-up icon grid without nesting a
 * second block (DA flattens nested blocks on upload).
 */
function buildValueProps(cell) {
  const grid = document.createElement('div');
  grid.className = 'columns-valueprops-grid';
  const children = [...cell.children];
  for (let i = 0; i < children.length; i += 2) {
    const iconP = children[i];
    const textP = children[i + 1];
    if (!iconP?.querySelector('picture, img')) break;
    const item = document.createElement('div');
    item.className = 'columns-valueprop';
    item.append(iconP);
    if (textP) item.append(textP);
    grid.append(item);
  }
  if (grid.children.length) cell.replaceChildren(grid);
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

  // value-props variant: turn the non-image cell's image+text pairs into a grid
  if (block.classList.contains('value-props')) {
    [...block.children].forEach((row) => {
      [...row.children].forEach((col) => {
        if (!col.classList.contains('columns-img-col') && col.querySelector('picture, img')) {
          buildValueProps(col);
        }
      });
    });
  }
}
