import { getMetadata } from '../../scripts/aem.js';
// test
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
 * Builds the expandable inline search control, matching the legacy behavior:
 * a search form whose text input is collapsed (width 0) by default and, on
 * clicking the magnifier submit button, expands leftward and focuses. When the
 * input already has a value, clicking the magnifier submits to search-results.
 * @param {Element} tools the nav tools container
 */
function buildSearch(tools) {
  const wrapper = document.createElement('div');
  wrapper.className = 'nav-search';

  const form = document.createElement('form');
  form.className = 'nav-search-form';
  form.setAttribute('role', 'search');
  form.action = '/search-results.html';
  form.method = 'get';

  const input = document.createElement('input');
  input.type = 'text';
  input.name = 'q';
  input.autocomplete = 'off';
  input.placeholder = 'Search';
  input.setAttribute('aria-label', 'Search');

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'nav-search-submit';
  submit.setAttribute('aria-label', 'Search');

  form.append(input, submit);

  const open = () => {
    wrapper.classList.add('is-open');
    submit.setAttribute('aria-expanded', 'true');
    input.focus();
  };
  const close = () => {
    wrapper.classList.remove('is-open');
    submit.setAttribute('aria-expanded', 'false');
  };

  // Magnifier click: first opens the field; once open, an empty field just
  // stays open (native submit is prevented) while a filled field submits.
  submit.setAttribute('aria-expanded', 'false');
  submit.addEventListener('click', (e) => {
    if (!wrapper.classList.contains('is-open')) {
      e.preventDefault();
      open();
    } else if (!input.value.trim()) {
      e.preventDefault();
      input.focus();
    }
  });

  // Close when focus leaves an empty field.
  input.addEventListener('blur', () => {
    if (!input.value.trim()) close();
  });

  wrapper.append(form);
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

  // Classify the three parts by CONTENT, not by top-level div position — the
  // document pipeline may deliver them as three sibling <div>s OR collapse
  // them into a single <div>. Brand = element holding the logo image; main
  // nav = the <ul> that has nested <ul> dropdowns; tools = the remaining <ul>.
  const src = fragment.body;
  const logoImg = src.querySelector('img');
  const lists = [...src.querySelectorAll('ul')].filter((ul) => !ul.closest('li'));
  const sectionsList = lists.find((ul) => ul.querySelector('li ul')) || lists[0];
  const toolsList = lists.find((ul) => ul !== sectionsList);

  const navBrand = document.createElement('div');
  navBrand.className = 'nav-brand';
  if (logoImg) {
    const brandLink = logoImg.closest('a') || logoImg;
    navBrand.append(brandLink.closest('p') || brandLink);
  }

  const navSections = document.createElement('div');
  navSections.className = 'nav-sections';
  if (sectionsList) navSections.append(sectionsList);

  const navTools = document.createElement('div');
  navTools.className = 'nav-tools';
  if (toolsList) navTools.append(toolsList);

  // Two rows: utility bar on top, then the main nav row (brand + sections).
  nav.append(navTools);

  // Brand: ensure the logo image is wrapped in a link to the homepage.
  const brandImg = navBrand.querySelector('img');
  if (brandImg) {
    // The document pipeline can leave a raw logo path unresolved (src="about:error").
    // Fall back to the known logo path so the brand logo always renders.
    if (!brandImg.getAttribute('src') || brandImg.src.startsWith('about:')) {
      brandImg.src = '/images/hoegemeyer-logo.png';
      brandImg.closest('picture')?.querySelectorAll('source').forEach((s) => s.remove());
    }
    let brandLink = brandImg.closest('a');
    if (!brandLink) {
      brandLink = document.createElement('a');
      brandLink.href = '/';
      brandImg.replaceWith(brandLink);
      brandLink.append(brandImg);
    }
    brandLink.setAttribute('href', '/');
    brandLink.setAttribute('aria-label', 'Hoegemeyer Hybrids home');
    // reset the brand container to just the logo link
    navBrand.textContent = '';
    navBrand.append(brandLink);
  }

  // Normalize: the document pipeline wraps each list link in a <p>
  // (li > p > a). Unwrap so links are direct children of their <li>, matching
  // the CSS and both fragment shapes (with or without the <p> wrapper).
  [navSections, navTools].forEach((container) => {
    container.querySelectorAll('li > p').forEach((p) => {
      if (p.children.length === 1 && p.firstElementChild.tagName === 'A') {
        p.replaceWith(p.firstElementChild);
      }
    });
  });

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
          // A dropdown trigger never navigates — it only toggles its panel. The
          // real destinations are the child links. This also neutralizes any
          // placeholder href the doc pipeline may emit (e.g. "#" or "/void-0").
          trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const open = li.getAttribute('aria-expanded') === 'true';
            closeDropdowns(navSections, li);
            li.setAttribute('aria-expanded', open ? 'false' : 'true');
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
      if (searchWrapper && !searchWrapper.querySelector('input').value.trim()) {
        searchWrapper.classList.remove('is-open');
        searchWrapper.querySelector('.nav-search-submit')?.setAttribute('aria-expanded', 'false');
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
