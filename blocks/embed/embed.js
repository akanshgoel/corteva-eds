/*
 * Embed block — renders an embedded external experience (iframe) or, when the
 * author pastes raw code, injects that markup verbatim.
 *
 * Two authoring shapes are supported:
 *  1. A link to the source to embed (preferred). The block contains an anchor;
 *     we build a responsive <iframe> pointing at its href. This survives the
 *     Document Authoring markdown round-trip cleanly.
 *  2. Raw pasted markup (iframe, HTML, etc.) inside a code block. Injected as-is.
 */

/**
 * Builds a responsive iframe wrapper for a given source URL.
 * @param {string} src The URL to embed
 * @param {string} title Accessible title for the iframe
 * @returns {HTMLElement} the wrapper element
 */
function buildIframe(src, title) {
  const wrapper = document.createElement('div');
  wrapper.className = 'embed-iframe';
  const iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.title = title || 'Embedded content';
  iframe.setAttribute('loading', 'lazy');
  iframe.setAttribute('allow', 'geolocation; fullscreen');
  iframe.setAttribute('allowfullscreen', 'true');
  iframe.setAttribute('scrolling', 'auto');
  wrapper.append(iframe);
  return wrapper;
}

export default function decorate(block) {
  // Shape 1: a link to embed.
  const link = block.querySelector('a[href]');
  if (link) {
    const src = link.href;
    const title = link.textContent.trim() || link.title;
    block.textContent = '';
    block.append(buildIframe(src, title));
    return;
  }

  // Shape 2: raw pasted markup.
  const code = block.querySelector('pre code') || block.querySelector('pre');
  const markup = code ? code.textContent : block.textContent;
  block.innerHTML = markup.trim();
}
