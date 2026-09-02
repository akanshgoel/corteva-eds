/*
 * Teaser block — hero banner and card variations, set via the block's variant class:
 *   hero-l1        : split content — title (left) + description (right), dark text,
 *                    over a background image. 400px tall.
 *   hero-l1 slim   : shorter hero-l1.
 *   hero-l2        : full-bleed image with a white title overlaid at the bottom.
 *                    400px tall.
 *   hero-l2 slim   : shorter hero-l2 (250px).
 *   banner         : full-bleed image with centred white content (title,
 *                    description, CTA button). 500px tall.
 *   card2 / card7  : stacked card — image on top, content (title, description,
 *                    text-link CTA) below. 328px wide.
 *   card3          : image card with a white title overlaid at the bottom.
 *
 * Content model (authored as a block table):
 *   - an image (becomes the background / card image)
 *   - a heading (the title)
 *   - an optional paragraph (the description)
 *   - an optional link (the call to action)
 *
 * @param {Element} block The block element
 */
export default function decorate(block) {
  // The image is delivered as a <picture> (optimized) or a bare <img>.
  const picture = block.querySelector('picture') || block.querySelector('img');
  const heading = block.querySelector('h1, h2, h3, h4, h5, h6');
  // The CTA is the first link in the block.
  const cta = block.querySelector('a');
  // The description is the first paragraph with real text that isn't the image
  // wrapper or the CTA link. Resolved before moving nodes so the emptied image
  // wrapper can't be mistaken for it.
  const description = [...block.querySelectorAll('p')]
    .find((p) => !p.querySelector('picture') && !p.querySelector('a') && p.textContent.trim());

  // Background / card image layer.
  const image = document.createElement('div');
  image.className = 'teaser-image';
  if (picture) image.append(picture);

  // Content layer (title + optional description + optional CTA).
  const content = document.createElement('div');
  content.className = 'teaser-content';

  if (heading) {
    heading.classList.add('teaser-title');
    content.append(heading);
  }
  if (description) {
    description.classList.add('teaser-description');
    content.append(description);
  }

  // CARD3: the whole card is one link over the image + title, with no separate
  // CTA text (matches live `a.cmp-teaser__link`). Other variants show the CTA.
  const isCard3 = block.classList.contains('card3');
  if (isCard3 && cta) {
    const link = document.createElement('a');
    link.className = 'teaser-link';
    link.href = cta.getAttribute('href');
    if (cta.getAttribute('title')) link.title = cta.getAttribute('title');
    link.append(image, content);
    block.replaceChildren(link);
    return;
  }
  if (cta) {
    // A standalone CTA link inside `.columns` (e.g. the deeproots "The Dirt"
    // card2 "Read More") is auto-tagged `.c-button` (filled blue button) by
    // scripts.js decorateContentButtons before the teaser inflates. The teaser
    // owns its own per-variant CTA styling (card2/card7 text-link with arrow,
    // banner solid button, hero-l2 outlined) via `.teaser-cta`, so drop the
    // generic button classes to prevent them overriding it.
    cta.classList.remove('c-button', 'button', 'secondary');
    cta.classList.add('teaser-cta');
    content.append(cta);
  }

  block.replaceChildren(image, content);
}
