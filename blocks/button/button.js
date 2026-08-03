/**
 * Button block
 * Content model: one cell containing a link (the CTA). The block variant
 * (primary | secondary) is set via the block's second class in authoring.
 *
 * Renders each authored link as an <a class="button-cta"> so the block owns
 * its styling independently of the boilerplate's generic a.button rules.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const links = [...block.querySelectorAll('a')];

  links.forEach((a) => {
    a.classList.add('button-cta');
    // Wrap the visible label so we can style it independently if needed.
    if (!a.querySelector('.button-cta-text')) {
      const label = a.textContent.trim();
      a.textContent = '';
      const span = document.createElement('span');
      span.className = 'button-cta-text';
      span.textContent = label;
      a.append(span);
    }
  });

  // Normalize the block DOM: keep just the anchors, drop empty table cells.
  const container = document.createElement('div');
  container.className = 'button-list';
  links.forEach((a) => container.append(a));

  if (links.length) block.replaceChildren(container);
}
