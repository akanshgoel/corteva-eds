// eslint-disable-next-line import/no-unresolved
import {
  toClassName, buildBlock, decorateBlock, loadBlock,
} from '../../scripts/aem.js';

/*
 * Tabs block — Hoegemeyer.
 *
 * Content tabs (switchable panels), the reusable base for the site's tab
 * components. Reproduces the source AEM "cmp-tabs" content-tabs behaviour.
 *
 * Variants (block classes):
 *   - (default)         plain content tabs
 *   - gray-background   the grey-band tab strip with a navy active underline
 *                       (source cmp-tabs--gray-background — "The Dirt" style)
 *
 * Authoring (block name: Tabs). One row per tab: the row's first cell is the
 * tab label; the rest of the row is that tab's panel content. Content authored
 * inside a panel (e.g. an Article Filter table) is decorated as a nested block.
 */

// Blocks that may nest inside a tab panel and be promoted from a raw table.
// Any table not naming one of these is left alone (data table / heading name).
const NESTED_BLOCK_NAMES = new Set([
  'accordion', 'article-filter', 'cards', 'carousel', 'columns',
  'embed', 'hero', 'separator', 'teaser', 'video', 'widget',
]);

/**
 * Convert nested block tables inside a tab panel into real blocks.
 *
 * Trigger: a single-header table naming a known block, optionally with a
 * parenthesised variant — "Columns (50 50)" → `columns 50-50`. Multi-cell
 * headers (data tables) and unknown names are left as-is.
 * @param {Element} panel the tab panel element
 */
async function decorateNestedBlocks(panel) {
  const tables = [...panel.querySelectorAll('table')];
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

    // baseName added first so classList[0] stays the block name after variants.
    const built = buildBlock(baseName, bodyRows);
    variants.forEach((v) => built.classList.add(v));
    table.replaceWith(built);
    decorateBlock(built);
    await loadBlock(built);
  }));
}

/**
 * loads and decorates the tabs
 * @param {Element} block The tabs block element
 */
export default async function decorate(block) {
  // build tablist
  const tablist = document.createElement('div');
  tablist.className = 'tabs-list';
  tablist.setAttribute('role', 'tablist');

  // decorate tabs and tabpanels
  const tabs = [...block.children].map((child) => child.firstElementChild);
  tabs.forEach((tab, i) => {
    const id = toClassName(tab.textContent);

    // decorate tabpanel
    const tabpanel = block.children[i];
    tabpanel.className = 'tabs-panel';
    tabpanel.id = `tabpanel-${id}`;
    tabpanel.setAttribute('aria-hidden', !!i);
    tabpanel.setAttribute('aria-labelledby', `tab-${id}`);
    tabpanel.setAttribute('role', 'tabpanel');

    // build tab button
    const button = document.createElement('button');
    button.className = 'tabs-tab';
    button.id = `tab-${id}`;
    button.innerHTML = tab.innerHTML;
    button.setAttribute('aria-controls', `tabpanel-${id}`);
    button.setAttribute('aria-selected', !i);
    button.setAttribute('role', 'tab');
    button.setAttribute('type', 'button');
    button.addEventListener('click', () => {
      block.querySelectorAll('[role=tabpanel]').forEach((panel) => {
        panel.setAttribute('aria-hidden', true);
      });
      tablist.querySelectorAll('button').forEach((btn) => {
        btn.setAttribute('aria-selected', false);
      });
      tabpanel.setAttribute('aria-hidden', false);
      button.setAttribute('aria-selected', true);
    });
    tablist.append(button);
    tab.remove();
  });

  block.prepend(tablist);

  // Promote panel CTA buttons. The import marks a source `c-button` link by
  // wrapping its text in <strong> (EDS's button signal); decorateButtons ran
  // before these panels existed, so replicate it here. `<strong><a>` → primary
  // c-button; plain solo links (no <strong>) stay text links.
  block.querySelectorAll('.tabs-panel p a[href]').forEach((a) => {
    const strong = a.querySelector('strong') || a.closest('strong');
    if (!strong) return;
    a.classList.add('button', 'primary');
    a.textContent = a.textContent.trim(); // unwrap <strong>, keep label
    const wrapper = a.closest('p');
    if (wrapper) wrapper.classList.add('button-container');
  });

  // Decorate blocks authored inside panels (e.g. Article Filter) — they arrive
  // as raw tables and would otherwise not be decorated.
  await Promise.all(
    [...block.querySelectorAll('.tabs-panel')].map((panel) => decorateNestedBlocks(panel)),
  );
}
