import { getMetadata } from '../../scripts/aem.js';

// Nav collapses to hamburger at tablet/mobile. Desktop (full nav) is >= 1040px.
const isDesktop = window.matchMedia('(min-width: 1040px)');

/**
 * Fetches the nav fragment markup. Tries the local content path first
 * (localhost / aem up), then the metadata-driven path (DA/EDS production).
 * @returns {Promise<Document>} parsed nav document
 */
async function fetchNav() {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) {
    resp = await fetch(`${navPath}.plain.html`);
  }
  const html = await resp.text();
  return new DOMParser().parseFromString(html, 'text/html');
}

/**
 * Closes every open dropdown in the main nav.
 * @param {Element} navSections the sections container
 * @param {Element} [except] a section to leave open
 */
function closeDropdowns(navSections, except) {
  navSections.querySelectorAll('.nav-drop[aria-expanded="true"]').forEach((drop) => {
    if (drop !== except) drop.setAttribute('aria-expanded', 'false');
  });
}

/**
 * Builds the expandable search control in the tools area.
 * @param {Element} tools the nav tools container
 */
function buildSearch(tools) {
  const wrapper = document.createElement('div');
  wrapper.className = 'nav-search';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'nav-search-toggle';
  toggle.setAttribute('aria-label', 'Search');
  toggle.setAttribute('aria-expanded', 'false');

  const form = document.createElement('form');
  form.className = 'nav-search-form';
  form.setAttribute('role', 'search');
  form.action = '/search-results.html';
  form.method = 'get';

  const input = document.createElement('input');
  input.type = 'search';
  input.name = 'q';
  input.placeholder = 'Search';
  input.setAttribute('aria-label', 'Search');

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'nav-search-submit';
  submit.setAttribute('aria-label', 'Submit search');

  form.append(input, submit);

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
    wrapper.classList.toggle('is-open', !open);
    if (!open) input.focus();
  });

  wrapper.append(toggle, form);
  tools.append(wrapper);
}

/**
 * Toggles the mobile menu open/closed.
 * @param {Element} nav the nav element
 * @param {Boolean} [forceExpanded] optional forced state
 */
function toggleMenu(nav, forceExpanded = null) {
  const expanded = forceExpanded !== null
    ? !forceExpanded
    : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  if (button) {
    button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  }
}

/**
 * Resets nav state when crossing the desktop/mobile breakpoint.
 * @param {Element} nav the nav element
 */
function handleBreakpointChange(nav) {
  const navSections = nav.querySelector('.nav-sections');
  // close mobile drawer and restore scrolling
  nav.setAttribute('aria-expanded', 'false');
  document.body.style.overflowY = '';
  const button = nav.querySelector('.nav-hamburger button');
  if (button) button.setAttribute('aria-label', 'Open navigation');
  // collapse any open dropdowns
  if (navSections) closeDropdowns(navSections);
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const fragment = await fetchNav();

  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-expanded', 'false');
  while (fragment.body.firstElementChild) nav.append(fragment.body.firstElementChild);

  // classify the three sections: brand, sections (main nav), tools (utility)
  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  const navBrand = nav.querySelector('.nav-brand');
  const navSections = nav.querySelector('.nav-sections');
  const navTools = nav.querySelector('.nav-tools');

  // Reorder into two rows: utility bar on top, then the main nav row.
  // nav.plain.html order is brand, sections, tools; the source shows
  // the utility (tools) bar above the main nav.
  if (navTools) nav.prepend(navTools);

  // Brand: wrap the logo image in the Home link, drop the redundant "Home" text link
  if (navBrand) {
    const links = [...navBrand.querySelectorAll('a')];
    const img = navBrand.querySelector('img');
    const homeLink = links.find((a) => !a.querySelector('img'));
    if (img && homeLink) {
      // The document pipeline can leave a raw logo path unresolved (src="about:error").
      // Fall back to the alt-derived source path so the brand logo always renders.
      if (!img.getAttribute('src') || img.src.startsWith('about:')) {
        img.src = '/images/hoegemeyer-logo.png';
        img.closest('picture')?.querySelectorAll('source').forEach((s) => s.remove());
      }
      homeLink.textContent = '';
      homeLink.setAttribute('aria-label', 'Hoegemeyer Hybrids home');
      homeLink.append(img);
      // remove any leftover empty paragraphs / duplicate anchors
      navBrand.querySelectorAll('p').forEach((p) => {
        if (!p.textContent.trim() && !p.querySelector('a, img')) p.remove();
      });
      links.filter((a) => a !== homeLink).forEach((a) => a.closest('p, li')?.remove());
    }
  }

  // Main nav: mark items with a nested list as dropdowns
  if (navSections) {
    navSections.querySelectorAll(':scope ul > li').forEach((li) => {
      if (li.querySelector('ul')) {
        li.classList.add('nav-drop');
        li.setAttribute('aria-expanded', 'false');
        const panel = li.querySelector(':scope > ul');
        if (panel) {
          panel.classList.add('nav-dropdown');
          panel.setAttribute('role', 'menu');
          // Dropdowns with more than two items render in two columns (matches
          // the source secondary-nav layout). Data-driven, not site-specific.
          const itemCount = panel.querySelectorAll(':scope > li').length;
          if (itemCount > 2) panel.classList.add('nav-dropdown-cols');
          // Mobile slide-in sub-panels use a Back button (hidden on desktop via CSS).
          const back = document.createElement('button');
          back.type = 'button';
          back.className = 'nav-drop-back';
          back.textContent = 'Back';
          back.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            li.setAttribute('aria-expanded', 'false');
          });
          panel.prepend(back);
        }
        const trigger = li.querySelector(':scope > a');
        const openOnHover = () => {
          if (isDesktop.matches) {
            closeDropdowns(navSections, li);
            li.setAttribute('aria-expanded', 'true');
          }
        };
        const closeOnLeave = () => {
          if (isDesktop.matches) li.setAttribute('aria-expanded', 'false');
        };
        li.addEventListener('mouseenter', openOnHover);
        li.addEventListener('mouseleave', closeOnLeave);
        // click/keyboard toggles (used on tablet/mobile, and for a11y)
        if (trigger) {
          trigger.setAttribute('role', 'button');
          trigger.setAttribute('aria-haspopup', 'true');
          // A trigger is a "real" navigable link only when its href points to a
          // path (starts with /) or an http(s) URL. Placeholder hrefs just toggle.
          const isRealLink = (a) => {
            const href = (a.getAttribute('href') || '').trim();
            return href.startsWith('/') || /^https?:\/\//i.test(href);
          };
          trigger.addEventListener('click', (e) => {
            if (!isRealLink(trigger)) {
              e.preventDefault();
              const open = li.getAttribute('aria-expanded') === 'true';
              closeDropdowns(navSections, li);
              li.setAttribute('aria-expanded', open ? 'false' : 'true');
            }
          });
        }
      }
    });
  }

  // Build the main nav row: brand + sections + search + hamburger
  const navMain = document.createElement('div');
  navMain.className = 'nav-main';

  // search control lives in the main row
  const searchHost = document.createElement('div');
  searchHost.className = 'nav-tools-search';
  buildSearch(searchHost);
  const search = searchHost.firstElementChild;

  // Hamburger for tablet/mobile
  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav));

  if (navBrand) navMain.append(navBrand);
  if (navSections) navMain.append(navSections);
  if (search) navMain.append(search);
  navMain.append(hamburger);
  nav.append(navMain);

  // Close dropdowns / mobile menu when clicking outside the nav
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target)) {
      if (navSections) closeDropdowns(navSections);
      const searchWrapper = nav.querySelector('.nav-search.is-open');
      if (searchWrapper) {
        searchWrapper.classList.remove('is-open');
        searchWrapper.querySelector('.nav-search-toggle')?.setAttribute('aria-expanded', 'false');
      }
    }
  });

  // Reset state cleanly when resizing across the breakpoint
  isDesktop.addEventListener('change', () => handleBreakpointChange(nav));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
