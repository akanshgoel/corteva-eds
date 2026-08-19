/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: hoegemeyer site-wide cleanup.
 * All selectors verified against migration-work/cleaned.html.
 *
 * The global header (div.globalheader) and footer (div.globalfooter) are site
 * chrome, not authored page content — EDS renders its own header/footer blocks,
 * so we strip both here (they must NOT appear as content on the migrated page).
 * The auto-generated breadcrumb and the TrustArc cookie-consent band are also
 * chrome and are removed.
 */

const H = { before: 'beforeTransform', after: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === H.before) {
    WebImporter.DOMUtils.remove(element, [
      // Global header/footer chrome (each wrapped in an experience fragment).
      // EDS supplies its own header/footer, so these are not page content.
      '.globalheader',
      '.globalfooter',
      '.cmp-experiencefragment',
      // Auto-generated breadcrumb chrome (div.social-share wrapper).
      '.social-share',
      // TrustArc cookie-consent band ("Corteva Cookie Policy …") — injected
      // shell UI, not present as content on the live site.
      '#consent_blackbar',
      '.consent_blackbar',
      '[class*="truste"]',
    ]);
  }

  if (hookName === H.after) {
    // Stray non-authorable elements observed in cleaned.html:
    // <meta> tags emitted inside breadcrumb/image components and orphaned
    // <source>/<noscript>/<link> markup.
    WebImporter.DOMUtils.remove(element, ['meta', 'source', 'noscript', 'link']);
  }
}
