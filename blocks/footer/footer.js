import { getMetadata } from '../../scripts/aem.js';

/**
 * Fetches the footer fragment. Tries the local content path first (localhost /
 * aem up), then the metadata-driven path (DA/EDS production).
 * @returns {Promise<Document>} parsed footer document
 */
async function fetchFooter() {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  let resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) {
    resp = await fetch(`${footerPath}.plain.html`);
  }
  const html = await resp.text();
  return new DOMParser().parseFromString(html, 'text/html');
}

/**
 * Ensures every footer image resolves. Derives the canonical /images path from
 * the file name so relative paths and pipeline-broken src="about:error" both
 * normalize to a working absolute path.
 * @param {Element} scope
 */
function normalizeImages(scope) {
  scope.querySelectorAll('img').forEach((img) => {
    const raw = img.getAttribute('src') || '';
    const file = raw.split('/').pop();
    if (file && (!raw || raw.startsWith('about:') || !raw.startsWith('/'))) {
      img.setAttribute('src', `/images/${file}`);
      img.closest('picture')?.querySelectorAll('source').forEach((s) => s.remove());
    }
  });
}

/**
 * Unwraps single-anchor <p> wrappers the document pipeline adds around links,
 * so links sit directly in their list item for consistent styling.
 * @param {Element} scope
 */
function unwrapLinkParagraphs(scope) {
  scope.querySelectorAll('li > p').forEach((p) => {
    if (p.children.length === 1 && p.firstElementChild.tagName === 'A') {
      p.replaceWith(p.firstElementChild);
    }
  });
}

/**
 * Builds a back-to-top button that smooth-scrolls to the top of the page.
 * @returns {HTMLButtonElement}
 */
function buildBackToTop() {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'footer-back-to-top';
  btn.setAttribute('aria-label', 'Scroll to top');
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  return btn;
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const fragment = await fetchFooter();

  block.textContent = '';
  const footer = document.createElement('div');
  footer.className = 'footer-inner';
  while (fragment.body.firstElementChild) footer.append(fragment.body.firstElementChild);

  normalizeImages(footer);
  unwrapLinkParagraphs(footer);

  // The pipeline delivers the two sections as sibling <div>s or (when collapsed)
  // as one <div>. Classify by content: the section with the copyright line is
  // the legal band; the other is the upper (brand + social + links) band.
  const sections = [...footer.children].filter((el) => el.tagName === 'DIV');
  const hasCopyright = (el) => /Trademarks of Corteva|©/.test(el.textContent);
  const upper = sections.find((s) => !hasCopyright(s)) || sections[0];
  const lower = sections.find((s) => hasCopyright(s)) || sections[1] || sections[0];

  if (upper) {
    upper.classList.add('footer-top');
    const lists = [...upper.querySelectorAll(':scope > ul')];
    const socialList = lists.find((ul) => ul.querySelector('a img')) || lists[0];
    const linkList = lists.find((ul) => ul !== socialList);
    if (socialList) socialList.classList.add('footer-social');
    if (linkList) linkList.classList.add('footer-links');
    upper.querySelectorAll(':scope > p').forEach((p) => {
      if (p.querySelector('img')) p.classList.add('footer-brand');
      else if (p.textContent.trim() && !p.querySelector('a')) p.classList.add('footer-connect');
    });
  }

  if (lower) {
    lower.classList.add('footer-bottom');
    const links = [...lower.querySelectorAll(':scope > ul')][0];
    if (links) links.classList.add('footer-legal');
    lower.querySelectorAll(':scope > p').forEach((p) => {
      if (p.querySelector('img')) p.classList.add('footer-brand');
      else p.classList.add('footer-copyright');
    });
  }

  // External links open in a new tab (matches source social + brand-store links).
  footer.querySelectorAll('a[href^="http"]').forEach((a) => {
    if (!a.href.includes(window.location.hostname)) {
      a.target = '_blank';
      a.rel = 'noopener';
    }
  });

  block.append(footer);
  block.append(buildBackToTop());
}
