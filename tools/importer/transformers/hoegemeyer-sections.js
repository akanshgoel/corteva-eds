/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: about-page section boundaries + alignment.
 *
 * Runs in afterTransform, AFTER block parsing. At this point each parsed block
 * is a <table> (WebImporter.Blocks.createBlock output) still nested in the
 * source grid; default content (headings/paragraphs) is likewise deep in the
 * tree. The flat document only emerges later in the markdown roundtrip, which
 * preserves document order — so we insert <hr> section breaks and
 * `section-metadata` tables as document-order siblings of the block/content
 * elements, and they land in the right place in the flat output.
 *
 * Live-site flow (about.html):
 *   teaser(hero) │ [intro heading+copy]·center │ carousel │
 *   [THE HEART OF HOEGEMEYER]·center │ columns(33-33-33) │
 *   [SEE WHERE WE'VE BEEN + copy]·center │ timeline columns(50-50)×6
 *
 * Centred default-content groups get a Section Metadata Style of `text-center`;
 * blocks stay left-aligned; consecutive 50-50 timeline rows share one section.
 */

const H = { before: 'beforeTransform', after: 'afterTransform' };

function classify(el) {
  if (el.tagName === 'TABLE') {
    const head = (el.querySelector('td, th')?.textContent || '').toLowerCase();
    if (head.includes('teaser')) return 'teaser';
    if (head.includes('carousel')) return 'carousel';
    if (head.includes('columns')) return head.includes('50-50') ? 'timeline' : 'cols3';
    if (head.includes('metadata')) return 'skip';
    return 'block';
  }
  return 'text';
}

export default function transform(hookName, element, payload) {
  if (hookName !== H.after) return;
  const main = element;
  const doc = main.ownerDocument;

  // Content items in document order: every parsed block table, plus default
  // content (headings/paragraphs/lists) that is NOT inside a block table.
  const items = [...main.querySelectorAll('table, h1, h2, h3, h4, h5, h6, p, ul, ol')]
    .filter((el) => (el.tagName === 'TABLE' ? true : !el.closest('table')))
    .map((el) => ({ el, type: classify(el) }))
    .filter((it) => it.type !== 'skip');

  if (items.length < 2) return;

  // Group into sections (timeline rows merge; consecutive text merges).
  const sections = [];
  let cur = null;
  items.forEach(({ el, type }) => {
    const mergeable = type === 'timeline' || type === 'text';
    if (!cur || !(mergeable && cur.type === type)) {
      cur = { type, els: [] };
      sections.push(cur);
    }
    cur.els.push(el);
  });

  if (sections.length < 2) return;

  const makeMetadata = (styleValue) => {
    const meta = doc.createElement('table');
    const head = doc.createElement('tr');
    const th = doc.createElement('td');
    th.textContent = 'Section Metadata';
    head.append(th);
    const row = doc.createElement('tr');
    const k = doc.createElement('td');
    k.textContent = 'Style';
    const v = doc.createElement('td');
    v.textContent = styleValue;
    row.append(k, v);
    meta.append(head, row);
    return meta;
  };

  // Insert an <hr> before the first element of each section after the first,
  // and a text-center Section Metadata table after each centred text section.
  sections.forEach((section, i) => {
    const first = section.els[0];
    const last = section.els[section.els.length - 1];
    if (i > 0 && first.parentNode) {
      first.parentNode.insertBefore(doc.createElement('hr'), first);
    }
    if (section.type === 'text' && last.parentNode) {
      last.parentNode.insertBefore(makeMetadata('text-center'), last.nextSibling);
    }
  });
}
