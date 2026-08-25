import { createOptimizedPicture, readBlockConfig } from '../../scripts/aem.js';

/*
 * Article Filter block — Hoegemeyer.
 *
 * Replaces the legacy AEM `cmp-article-filter` component (which called a Sling
 * servlet, `articlefilter.mediacenter.json`). Here the data comes from an EDS
 * query-index instead: `helix-query.yaml` publishes a feed JSON (e.g.
 * `/about/news/query-index.json`) with one row per article page. This block
 * fetches that index and renders the same card list + search + "Load More" UI,
 * with all filtering done client-side (no per-interaction network calls).
 *
 * Authoring (block config table):
 *   | Article Filter |            |
 *   | source         | /about/news/query-index.json |
 *   | page-size      | 5          |   (optional, default 5)
 *
 * The markup/classnames mirror the source component so the styling maps 1:1.
 */

const DEFAULT_PAGE_SIZE = 5;

/** Fetch all rows from a (possibly paginated) EDS query-index. */
async function fetchIndex(source) {
  const rows = [];
  let offset = 0;
  const limit = 500;
  // The index may paginate; loop until we've read `total` rows.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const url = new URL(source, window.location.origin);
    url.searchParams.set('offset', offset);
    url.searchParams.set('limit', limit);
    // eslint-disable-next-line no-await-in-loop
    const resp = await fetch(url);
    if (!resp.ok) break;
    // eslint-disable-next-line no-await-in-loop
    const json = await resp.json();
    const data = json.data || [];
    rows.push(...data);
    const total = json.total ?? data.length;
    offset += data.length;
    if (!data.length || offset >= total) break;
  }
  return rows;
}

/** Newest first, by the index's lastModified (seconds epoch, per EDS). */
function sortByDateDesc(rows) {
  return rows.slice().sort((a, b) => (Number(b.lastModified) || 0) - (Number(a.lastModified) || 0));
}

/** Build one article card row, mirroring the legacy DOM/classnames. */
function buildCard(row) {
  const item = document.createElement('div');
  item.className = 'article-filter__item';

  // Image (154×154 square, cover) — links to the article.
  const imageWrap = document.createElement('a');
  imageWrap.className = 'article-filter__item-image';
  imageWrap.href = row.path;
  if (row.image) {
    const pic = createOptimizedPicture(row.image, row.title || '', false, [{ width: '300' }]);
    imageWrap.append(pic);
  }

  // Content: title link + description.
  const content = document.createElement('div');
  content.className = 'article-filter__item-content';
  const titleLink = document.createElement('a');
  titleLink.href = row.path;
  const title = document.createElement('h2');
  title.className = 'article-filter__item-title';
  title.textContent = row.title || '';
  titleLink.append(title);
  content.append(titleLink);
  if (row.description) {
    const desc = document.createElement('p');
    desc.className = 'article-filter__item-desc';
    desc.textContent = row.description;
    content.append(desc);
  }

  item.append(imageWrap, content);
  return item;
}

export default async function decorate(block) {
  const cfg = readBlockConfig(block);
  const source = cfg.source || cfg.index || '/about/news/query-index.json';
  const pageSize = parseInt(cfg['page-size'] || cfg.pagesize, 10) || DEFAULT_PAGE_SIZE;
  // Optional category tabs. Author may list them explicitly ("tabs" config);
  // otherwise they're auto-derived from distinct `category` values in the index
  // (e.g. the articles feed: "All Blogs" / "Guess That Pest"). The news feed has
  // no category → no tabs.
  const configuredTabs = (cfg.tabs || '').split(',').map((t) => t.trim()).filter(Boolean);

  block.textContent = '';

  const view = document.createElement('div');
  view.className = 'article-filter__view';
  view.innerHTML = `
    <div class="article-filter__tabs" role="tablist" hidden></div>
    <div class="article-filter__search">
      <input type="text" class="article-filter__search-input" placeholder="Search" aria-label="Search articles">
      <button type="button" class="article-filter__search-btn">SEARCH</button>
    </div>
    <div class="article-filter__list-header">
      <h4>Results</h4>
      <span class="article-filter__count"></span>
    </div>
    <div class="article-filter__list"></div>
    <div class="article-filter__more">
      <button type="button" class="article-filter__more-btn">Load More</button>
    </div>`;
  block.append(view);

  const tabsEl = view.querySelector('.article-filter__tabs');
  const listEl = view.querySelector('.article-filter__list');
  const countEl = view.querySelector('.article-filter__count');
  const moreWrap = view.querySelector('.article-filter__more');
  const moreBtn = view.querySelector('.article-filter__more-btn');
  const searchInput = view.querySelector('.article-filter__search-input');
  const searchBtn = view.querySelector('.article-filter__search-btn');

  let all = [];
  try {
    all = sortByDateDesc(await fetchIndex(source));
  } catch (e) {
    listEl.innerHTML = '<p class="article-filter__empty">Unable to load articles.</p>';
    return;
  }

  // Resolve tab labels: explicit config, else distinct category values.
  let tabs = configuredTabs;
  if (!tabs.length) {
    const cats = [...new Set(all.map((r) => (r.category || '').trim()).filter(Boolean))];
    if (cats.length > 1) tabs = cats;
  }

  let activeTab = tabs[0] || null;
  let shown = 0;
  let filtered = all;

  const compute = () => {
    const q = searchInput.value.trim().toLowerCase();
    filtered = all.filter((r) => {
      if (activeTab && (r.category || '').trim() !== activeTab) return false;
      if (q && !`${r.title || ''} ${r.description || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  };

  const render = (reset) => {
    if (reset) { listEl.textContent = ''; shown = 0; }
    const next = filtered.slice(shown, shown + pageSize);
    next.forEach((row) => listEl.append(buildCard(row)));
    shown += next.length;
    countEl.textContent = `${filtered.length} Result${filtered.length === 1 ? '' : 's'} Found`;
    moreWrap.style.display = shown < filtered.length ? '' : 'none';
  };

  const refresh = () => { compute(); render(true); };

  // Build tab UI when there are categories.
  if (tabs.length > 1) {
    tabsEl.hidden = false;
    tabs.forEach((label) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'article-filter__tab';
      btn.setAttribute('role', 'tab');
      btn.textContent = label;
      btn.setAttribute('aria-selected', label === activeTab ? 'true' : 'false');
      btn.addEventListener('click', () => {
        activeTab = label;
        tabsEl.querySelectorAll('.article-filter__tab').forEach((t) => t.setAttribute('aria-selected', t === btn ? 'true' : 'false'));
        refresh();
      });
      tabsEl.append(btn);
    });
  } else {
    activeTab = null;
  }

  moreBtn.addEventListener('click', () => render(false));
  searchBtn.addEventListener('click', refresh);
  searchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') refresh(); });
  searchInput.addEventListener('input', () => { if (!searchInput.value.trim()) refresh(); });

  refresh();
}
