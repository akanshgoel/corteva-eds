/*
 * Accordion block — expandable question/answer (FAQ) list.
 * Based on the AEM Block Collection accordion
 * (https://www.aem.live/developer/block-collection/accordion), adapted to
 * mirror the source site's cmp-accordion markup so the migrated styling
 * (navy uppercase questions, thin rules, circular chevron) carries over.
 *
 * Content model (authored as a block table): one row per item.
 *   Cell 1 = the question (summary / header label)
 *   Cell 2 = the answer (rich-text body)
 *
 * Each row is rendered as a native <details>/<summary> pair so the panels
 * expand and collapse without any extra JavaScript state. The source
 * cmp-accordion__* class names are preserved on the generated nodes so the
 * CSS (and any downstream tooling) can target the familiar hooks.
 *
 * VARIANT — `non-accordion`: the source `cmp-accordion--non-accordion` renders a
 * STATIC, always-open list (no toggle) — e.g. the AGRONOMY FIRST "What Does…"
 * image+title+text cards and the Granular Insights "RELATED ARTICLES" list. In
 * that variant every item is rendered open, the chevron is hidden, and the
 * summary is non-interactive (CSS handles the visual side).
 *
 * @param {Element} block The block element
 */
export default function decorate(block) {
  block.classList.add('cmp-accordion');
  const isStatic = block.classList.contains('non-accordion');

  [...block.children].forEach((row) => {
    const label = row.children[0];
    const body = row.children[1];

    // Question / header → <summary>.
    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label cmp-accordion__button';
    const title = document.createElement('span');
    title.className = 'cmp-accordion__title';
    if (label) title.append(...label.childNodes);
    summary.append(title);
    // The collapse chevron only belongs on a real (toggling) accordion.
    if (!isStatic) {
      const icon = document.createElement('span');
      icon.className = 'cmp-accordion__icon';
      icon.setAttribute('aria-hidden', 'true');
      summary.append(icon);
    }

    // Answer → body.
    const panel = body || document.createElement('div');
    panel.className = 'accordion-item-body cmp-accordion__panel';

    // Item wrapper. Static variant renders open and non-collapsible.
    const details = document.createElement('details');
    details.className = 'accordion-item cmp-accordion__item';
    if (isStatic) {
      details.open = true;
      // Prevent the native toggle so it stays open (no interaction).
      summary.addEventListener('click', (e) => e.preventDefault());
    }
    details.append(summary, panel);
    row.replaceWith(details);
  });
}
