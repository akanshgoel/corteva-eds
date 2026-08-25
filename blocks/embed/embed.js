/*
 * Embed block — renders an embedded external experience (iframe), a self-
 * contained HTML fragment (e.g. a third-party form with its own scripts), or
 * raw pasted markup, verbatim.
 *
 * Authoring shapes (in priority order):
 *  1. A link to an HTML fragment committed in the project (href ends in .html,
 *     e.g. /embeds/contact-form.html). We fetch it and inject it as-is, then
 *     re-create its <script> elements so they actually execute — scripts added
 *     via innerHTML never run. Used for migrated reCAPTCHA/Eloqua forms whose
 *     markup we preserve exactly from the source site.
 *  2. A link to an external experience to embed in an <iframe> (e.g. a store
 *     locator). Survives the Document Authoring markdown round-trip cleanly.
 *  3. Raw pasted markup inside a code block. Injected as-is.
 */

/**
 * Re-creates every <script> in a container so the browser executes it. Scripts
 * inserted via innerHTML are inert; cloning them into fresh <script> nodes (in
 * document order, external ones awaited) runs them.
 * @param {Element} container element whose scripts should execute
 */
async function runScripts(container) {
  const scripts = [...container.querySelectorAll('script')];
  // eslint-disable-next-line no-restricted-syntax
  for (const old of scripts) {
    const script = document.createElement('script');
    [...old.attributes].forEach((attr) => script.setAttribute(attr.name, attr.value));
    if (old.src) {
      // Await external scripts so later inline scripts see their globals (jQuery, grecaptcha…).
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => {
        script.onload = resolve;
        script.onerror = resolve;
        old.replaceWith(script);
      });
    } else {
      script.textContent = old.textContent;
      old.replaceWith(script);
    }
  }
}

/**
 * Rebinds inline event-handler attributes (onsubmit, onclick, …) as proper
 * addEventListener calls. EDS serves pages under a Content-Security-Policy that
 * blocks inline handlers, so migrated third-party markup that relies on them
 * (e.g. <form onsubmit="return submitUserForm()">) would otherwise be dead.
 * @param {Element} container element whose inline handlers should be rebound
 */
function rebindInlineHandlers(container) {
  const HANDLERS = ['onsubmit', 'onclick', 'onchange', 'onkeyup', 'onblur', 'onfocus', 'onload'];
  HANDLERS.forEach((attr) => {
    const event = attr.slice(2);
    container.querySelectorAll(`[${attr}]`).forEach((el) => {
      const code = el.getAttribute(attr);
      el.removeAttribute(attr);
      el.addEventListener(event, (e) => {
        // Run the original handler body with `this` bound to the element.
        // `return false` in the source suppresses default (e.g. form submit).
        // eslint-disable-next-line no-new-func
        const fn = new Function('event', `${code}`);
        const result = fn.call(el, e);
        if (result === false) e.preventDefault();
      });
    });
  });
}

/**
 * Builds a responsive iframe wrapper for a given source URL.
 * @param {string} src The URL to embed
 * @param {string} title Accessible title for the iframe
 * @param {string} [ratio] Optional CSS aspect-ratio value (e.g. "3.6" or "16/9").
 *   When set, the iframe fills a ratio-locked box (used for the Ceros hero);
 *   otherwise the CSS min-height rules apply (store locators, etc.).
 * @returns {HTMLElement} the wrapper element
 */
function buildIframe(src, title, ratio) {
  const wrapper = document.createElement('div');
  wrapper.className = 'embed-iframe';
  const iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.title = title || 'Embedded content';
  iframe.setAttribute('loading', 'lazy');
  iframe.setAttribute('allow', 'geolocation; fullscreen');
  iframe.setAttribute('allowfullscreen', 'true');
  iframe.setAttribute('scrolling', 'auto');
  if (ratio) {
    wrapper.classList.add('embed-iframe-ratio');
    wrapper.style.aspectRatio = ratio;
  }
  wrapper.append(iframe);
  return wrapper;
}

export default async function decorate(block) {
  const link = block.querySelector('a[href]');
  if (link) {
    const url = new URL(link.href);
    const isFragment = url.pathname.endsWith('.html');
    if (isFragment) {
      // Shape 1: local HTML fragment (form + scripts) — inject and run scripts.
      try {
        const resp = await fetch(link.href);
        if (resp.ok) {
          block.innerHTML = await resp.text();
          rebindInlineHandlers(block);
          await runScripts(block);
          return;
        }
      } catch (e) {
        // fall through to iframe/markup handling on failure
      }
    }
    // Shape 2: external experience — embed in an iframe. An `?aspect=<w/h>`
    // query param (e.g. Ceros hero) locks the iframe to that aspect ratio.
    const title = link.textContent.trim() || link.title;
    const ratio = url.searchParams.get('aspect');
    // Strip our private param before embedding so the provider URL stays clean.
    if (ratio) url.searchParams.delete('aspect');
    block.textContent = '';
    block.append(buildIframe(url.toString(), title, ratio));
    return;
  }

  // Shape 3: raw pasted markup.
  const code = block.querySelector('pre code') || block.querySelector('pre');
  const markup = code ? code.textContent : block.textContent;
  block.innerHTML = markup.trim();
  await runScripts(block);
}
