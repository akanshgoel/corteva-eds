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
 * @param {Element} block The block element
 */
export default function decorate(block) {
  block.classList.add('cmp-accordion');

  [...block.children].forEach((row) => {
    const label = row.children[0];
    const body = row.children[1];

    // Question / header → <summary>.
    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label cmp-accordion__button';
    const title = document.createElement('span');
    title.className = 'cmp-accordion__title';
    if (label) title.append(...label.childNodes);
    const icon = document.createElement('span');
    icon.className = 'cmp-accordion__icon';
    icon.setAttribute('aria-hidden', 'true');
    summary.append(title, icon);

    // Answer → body.
    const panel = body || document.createElement('div');
    panel.className = 'accordion-item-body cmp-accordion__panel';

    // Item wrapper.
    const details = document.createElement('details');
    details.className = 'accordion-item cmp-accordion__item';
    details.append(summary, panel);
    row.replaceWith(details);
  });
}
