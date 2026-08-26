// eslint-disable-next-line import/no-unresolved
import { toClassName } from '../../scripts/aem.js';

/*
 * Jump-to Tabs — anchor navigation for jumping to sections on the SAME page.
 *
 * This is NOT the content-switching tabs block (that is `tabs`, incl. its
 * `gray-background` variant). Every
 * link here is a real in-page anchor: clicking scrolls to the matching section
 * and marks the link active; a scrollspy keeps the active link in sync as the
 * reader scrolls. On narrow viewports the strip collapses to a "Jump to:"
 * dropdown.
 *
 * VARIANTS (block class)
 *   .jumpto-tabs.horizontal  → horizontal strip with a gray bottom guide-line;
 *                              active link carries a navy underline.
 *   .jumpto-tabs.vertical    → left-hand vertical column with a gray right
 *                              guide-line; active link carries a navy bar.
 *   (no modifier defaults to horizontal.)
 *
 * CONTENT MODEL (author-friendly — one row per jump target)
 *   | Jumpto-Tabs (horizontal)          |                              |
 *   | Log In                            | #log-in                      |
 *   | Plan. Grow. Analyze.              | #plan-grow-analyze           |
 *   | VRS                               | #vrs                         |
 *
 *   Cell 1 = the tab label (what the reader sees).
 *   Cell 2 = the anchor target. Accepts any of:
 *              - a bare id fragment ("#log-in" or "log-in")
 *              - a link <a href="#log-in">…</a>
 *            If cell 2 is omitted, the target id is derived from the label.
 *   The target ids must match the `id` of the sections you are linking to
 *   (author them via Section Metadata → "id").
 */

const DEFAULT_LABEL = 'Jump to:';

/** Resolve a row's second cell into a "#fragment" href.
 *  Document Authoring's markdown round-trip drops bare "#anchor" hrefs — an
 *  authored link to "#proven-right-here" is published as href="/" (or "#/").
 *  So a link/text fragment is only trusted when it yields a REAL slug; anything
 *  empty, "/", or "#/" falls back to the label slug (toClassName(label)), which
 *  equals the target section's Section-Metadata id by construction. */
function isUsableFragment(frag) {
  const f = (frag || '').replace(/^#/, '').replace(/^\//, '').trim();
  return f.length > 0;
}

function resolveHref(targetCell, label) {
  if (targetCell) {
    const link = targetCell.querySelector('a[href]');
    if (link) {
      const raw = (link.getAttribute('href') || '').trim().replace(/^\//, '');
      if (isUsableFragment(raw)) return `#${raw.replace(/^#/, '')}`;
    } else {
      const text = targetCell.textContent.trim();
      if (isUsableFragment(text)) return `#${text.replace(/^#/, '')}`;
    }
  }
  // Fall back to a slug of the label — matches the panel section id.
  return `#${toClassName(label)}`;
}

export default async function decorate(block) {
  // Default variant is horizontal.
  if (!block.classList.contains('vertical') && !block.classList.contains('horizontal')) {
    block.classList.add('horizontal');
  }

  // Read the authored rows into { label, href } targets before we rebuild.
  const targets = [...block.children].map((row) => {
    const cells = [...row.children];
    const label = (cells[0]?.textContent || '').trim();
    if (!label) return null;
    return { label, href: resolveHref(cells[1], label) };
  }).filter(Boolean);

  block.textContent = '';

  // Resolve a "#fragment" to its target section. EDS renders a Section
  // Metadata `id` as `data-id` on the section wrapper (NOT the element id), so
  // match either: a real element id first, then a `[data-id="…"]` section.
  const resolveTarget = (fragment) => {
    const id = fragment.replace(/^#/, '');
    return document.getElementById(id)
      || document.querySelector(`[data-id="${CSS.escape(id)}"]`);
  };

  // The site header is fixed (--nav-height reserves its space); scrolling a
  // target to the very top would tuck it under the header. Read the reserved
  // height so the landing position clears the header, with a small breathing gap.
  const headerOffset = () => {
    const navH = getComputedStyle(document.documentElement)
      .getPropertyValue('--nav-height').trim();
    const px = parseInt(navH, 10);
    return (Number.isNaN(px) ? 0 : px) + 16;
  };

  // Smooth-scroll to a target section, offset for the fixed header. Because the
  // section id lives in `data-id` (not a real element id), native hash scrolling
  // never fires, so we always scroll manually here.
  const scrollToTarget = (target, href) => {
    const top = target.getBoundingClientRect().top + window.pageYOffset - headerOffset();
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    // reflect the fragment in the URL without triggering a native jump
    window.history.replaceState(null, '', href);
  };

  // --- Desktop / tablet strip: role=tablist with a "Jump to:" title + links.
  const tablist = document.createElement('nav');
  tablist.className = 'jumpto-tabs-list';
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', DEFAULT_LABEL);

  const title = document.createElement('span');
  title.className = 'jumpto-tabs-title';
  title.textContent = DEFAULT_LABEL;
  tablist.append(title);

  const links = targets.map(({ label, href }, i) => {
    const a = document.createElement('a');
    a.className = 'jumpto-tabs-tab';
    a.href = href;
    a.textContent = label;
    a.setAttribute('role', 'tab');
    a.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    if (i === 0) a.classList.add('jumpto-tabs-tab-active');
    tablist.append(a);
    return a;
  });

  // --- Mobile dropdown: label + toggle button + searchable list.
  const dropdown = document.createElement('div');
  dropdown.className = 'jumpto-tabs-dropdown';

  const ddLabel = document.createElement('span');
  ddLabel.className = 'jumpto-tabs-dropdown-label';
  ddLabel.textContent = DEFAULT_LABEL;

  const listId = `jumpto-list-${Math.random().toString(36).slice(2, 8)}`;
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'jumpto-tabs-dropdown-toggle';
  toggle.textContent = targets[0]?.label || 'Select an option';
  toggle.setAttribute('aria-haspopup', 'listbox');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', listId);

  const ddList = document.createElement('ul');
  ddList.id = listId;
  ddList.className = 'jumpto-tabs-dropdown-list';
  ddList.setAttribute('role', 'listbox');
  ddList.hidden = true;

  const search = document.createElement('input');
  search.type = 'text';
  search.className = 'jumpto-tabs-dropdown-search';
  search.placeholder = 'Search…';
  search.setAttribute('aria-label', 'Filter options');
  const searchItem = document.createElement('li');
  searchItem.className = 'jumpto-tabs-dropdown-search-item';
  searchItem.append(search);
  ddList.append(searchItem);

  const ddItems = targets.map(({ label, href }) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    const a = document.createElement('a');
    a.href = href;
    a.textContent = label;
    a.dataset.label = label.toLowerCase();
    li.append(a);
    ddList.append(li);
    return li;
  });

  dropdown.append(ddLabel, toggle, ddList);

  const closeDropdown = () => {
    ddList.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    if (open) {
      closeDropdown();
    } else {
      ddList.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      search.value = '';
      ddItems.forEach((li) => { li.hidden = false; });
      search.focus();
    }
  });

  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    ddItems.forEach((li) => {
      const match = li.querySelector('a').dataset.label.includes(q);
      li.hidden = !match;
    });
  });

  ddList.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    toggle.textContent = a.textContent;
    closeDropdown();
    const href = a.getAttribute('href');
    const target = resolveTarget(href);
    if (target) {
      e.preventDefault();
      scrollToTarget(target, href);
    }
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) closeDropdown();
  });

  block.append(dropdown, tablist);

  // --- Active-state syncing.
  const setActive = (href) => {
    links.forEach((a) => {
      const on = a.getAttribute('href') === href;
      a.classList.toggle('jumpto-tabs-tab-active', on);
      a.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    const active = targets.find((t) => t.href === href);
    if (active) toggle.textContent = active.label;
  };

  links.forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      const target = resolveTarget(href);
      if (target) {
        e.preventDefault();
        scrollToTarget(target, href);
      }
      setActive(href);
    });
  });

  // Scrollspy: highlight the link for whichever target section is in view.
  // Map each section back to its owning link href (via id or data-id).
  const sectionByHref = new Map();
  targets.forEach((t) => {
    const sec = resolveTarget(t.href);
    if (sec) sectionByHref.set(sec, t.href);
  });
  const sections = [...sectionByHref.keys()];

  if (sections.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((en) => en.isIntersecting)
        .sort((x, y) => y.intersectionRatio - x.intersectionRatio)[0];
      if (visible) {
        const href = sectionByHref.get(visible.target);
        if (href) setActive(href);
      }
    }, { rootMargin: '-30% 0px -60% 0px', threshold: [0, 0.25, 0.5, 1] });
    sections.forEach((s) => observer.observe(s));
  }
}
