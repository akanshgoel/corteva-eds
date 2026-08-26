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
 * Ensures every footer image resolves to a committed /images asset. The DA
 * pipeline can deliver footer logos/icons with a broken src (`about:error`) that
 * has lost the original filename, so we map each image to its asset by alt text.
 * Falls back to deriving /images/<filename> from any usable src (relative paths).
 * @param {Element} scope
 */
const FOOTER_IMAGE_BY_ALT = [
  { test: /hoegemeyer/i, file: 'hoegemeyer-logo-white.png' },
  { test: /corteva/i, file: 'corteva-logo-white.png' },
  { test: /facebook/i, file: 'footer-facebook.png' },
  { test: /(^|\b)x( link)?\b|twitter/i, file: 'footer-x.png' },
  { test: /linkedin/i, file: 'footer-linkedin.png' },
  { test: /instagram/i, file: 'footer-instagram.png' },
  { test: /privacy choices/i, file: 'privacy-choices.jpg' },
];

function normalizeImages(scope) {
  scope.querySelectorAll('img').forEach((img) => {
    const raw = img.getAttribute('src') || '';
    const broken = !raw || raw.startsWith('about:') || !raw.startsWith('/');
    if (!broken) return;
    const alt = img.getAttribute('alt') || '';
    const match = FOOTER_IMAGE_BY_ALT.find((m) => m.test.test(alt));
    // Prefer the alt→asset map; else recover a filename from the src if usable.
    const file = match ? match.file : raw.split('/').pop();
    if (file && file !== 'about:error') {
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
  // Up-arrow icon (matches the source glyph: a vertical stem with a top cap /
  // arrowhead). Inline SVG so it renders crisply without the icomoon font.
  btn.innerHTML = `
    <svg class="footer-back-to-top-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 4 L12 20 M12 4 L6 10 M12 4 L18 10" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter"/>
    </svg>`;
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Visible only once the page is scrolled (matches the source: hidden and
  // non-interactive at the top, fading in after ~300px). The `is-visible`
  // class drives opacity + pointer-events in CSS.
  const THRESHOLD = 300;
  const toggle = () => {
    btn.classList.toggle('is-visible', window.scrollY > THRESHOLD);
  };
  window.addEventListener('scroll', toggle, { passive: true });
  toggle();

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

  // Collect the semantic pieces by content — robust whether the pipeline
  // delivers two section <div>s or collapses everything into one <div>.
  const allUls = [...footer.querySelectorAll('ul')];
  const socialList = allUls.find((ul) => ul.querySelector('img, picture'));
  const legalList = allUls.find((ul) => ul !== socialList
    && /Cookie Preferences|Privacy|Terms of Use/i.test(ul.textContent));
  const linkList = allUls.find((ul) => ul !== socialList && ul !== legalList);

  const paras = [...footer.querySelectorAll('p')];
  const logos = paras.filter((p) => p.querySelector('img'));
  const hoegLogo = logos.find((p) => /Hoegemeyer/i.test(p.querySelector('img')?.alt || ''))
    || logos[0];
  const cortevaLogo = logos.find((p) => /Corteva/i.test(p.querySelector('img')?.alt || ''))
    || logos[1];
  const connect = paras.find((p) => /Connect with us/i.test(p.textContent));
  const copyright = paras.find((p) => /Trademarks of Corteva|©/.test(p.textContent));

  // Build two fresh bands and distribute the pieces.
  const top = document.createElement('div');
  top.className = 'footer-top';
  const bottom = document.createElement('div');
  bottom.className = 'footer-bottom';

  if (hoegLogo) { hoegLogo.classList.add('footer-brand'); top.append(hoegLogo); }
  if (connect) { connect.classList.add('footer-connect'); top.append(connect); }
  if (socialList) { socialList.classList.add('footer-social'); top.append(socialList); }
  if (linkList) { linkList.classList.add('footer-links'); top.append(linkList); }

  if (cortevaLogo) { cortevaLogo.classList.add('footer-brand'); bottom.append(cortevaLogo); }
  if (legalList) { legalList.classList.add('footer-legal'); bottom.append(legalList); }
  if (copyright) { copyright.classList.add('footer-copyright'); bottom.append(copyright); }

  footer.textContent = '';
  footer.append(top, bottom);

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
