/*
 * Hero block — full-width banner. When the block contains an image, it becomes
 * the background and the remaining text (heading, copy, button) is overlaid and
 * centered. Used for the dark call-to-action banner.
 */
export default function decorate(block) {
  const picture = block.querySelector('picture');
  if (picture) {
    const bg = document.createElement('div');
    bg.className = 'hero-background';
    bg.append(picture);
    block.prepend(bg);
  }

  const content = document.createElement('div');
  content.className = 'hero-content';
  block.querySelectorAll(':scope > div:not(.hero-background)').forEach((row) => {
    while (row.firstElementChild) content.append(row.firstElementChild);
    row.remove();
  });
  block.append(content);
}
