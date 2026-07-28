/*
 * Embed block — renders author-provided markup verbatim.
 * The author pastes raw code (iframe, HTML, etc.) into a code block; this
 * takes that content and injects it as-is. No provider parsing or transforms.
 */
export default function decorate(block) {
  const code = block.querySelector('pre code') || block.querySelector('pre');
  const markup = code ? code.textContent : block.textContent;
  block.innerHTML = markup.trim();
}
