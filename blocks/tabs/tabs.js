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

/**
 * Decorate any nested block tables inside a tab panel.
 *
 * Content authored inside a tab (e.g. an Article Filter) arrives as a plain
 * table: a header row naming the block, then config/content rows. EDS only
 * auto-blocks tables that are direct section children, so a table nested in a
 * panel is left raw. Convert each such table into a real block and load it so
 * its own decorate() runs (renders the search UI, list, etc.).
 * @param {Element} panel the tab panel element
 */
async function decorateNestedBlocks(panel) {
  const tables = [...panel.querySelectorAll('table')];
  await Promise.all(tables.map(async (table) => {
    const rows = [...table.querySelectorAll('tr')];
    if (!rows.length) return;
    // First row's single header cell holds the block name (e.g. "Article Filter").
    const nameCell = rows[0].querySelector('th, td');
    const blockName = toClassName((nameCell?.textContent || '').trim());
    if (!blockName) return;
    // Remaining rows become the block's content rows (each cell → a cell div).
    const bodyRows = rows.slice(1).map((tr) => [...tr.children].map((td) => {
      const cell = document.createElement('div');
      cell.innerHTML = td.innerHTML;
      return cell;
    }));
    const built = buildBlock(blockName, bodyRows);
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

  // Decorate any blocks authored inside the tab panels (e.g. Article Filter),
  // which arrive as raw tables and would otherwise not be decorated.
  await Promise.all(
    [...block.querySelectorAll('.tabs-panel')].map((panel) => decorateNestedBlocks(panel)),
  );
}
