/* eslint-disable */
/* global WebImporter */
/**
 * Parser for block: carousel (video gallery)
 * Source: https://www.hoegemeyer.com/about.html  (.galleryvideoplayer .video-gallery)
 *
 * Follows the standard carousel convention: 2 columns, one row per slide.
 *   - Cell 1 (mandatory): the slide image (poster).
 *   - Cell 2 (optional): text content — title (heading), description, and a
 *     call-to-action link at the bottom (here, the YouTube watch URL, which the
 *     carousel block detects and turns into an in-place player).
 *
 * The source poster is a ytimg thumbnail (…/vi/<id>/…); we keep that image as
 * the slide image and derive the YouTube watch URL from the same id for the CTA.
 */
export default function parse(element, { document }) {
  const rows = [];

  // Each source slide is a carousel cell; fall back to the element itself.
  // A `single-slide` gallery may still expose a duplicate nav cell — treat the
  // whole gallery as one slide. Otherwise iterate the main content-slide cells,
  // and dedupe by video id so repeated cells (nav thumbnails) don't produce
  // duplicate slides.
  let slides;
  if (element.classList.contains('single-slide')) {
    slides = [element];
  } else {
    const contentSlides = element.querySelector('.video-gallery__content-slides');
    const scope = contentSlides || element;
    const cells = scope.querySelectorAll('.video-gallery__carousel-cell');
    slides = cells.length ? [...cells] : [element];
  }

  const seenVideoIds = new Set();

  slides.forEach((slide) => {
    const poster = slide.querySelector('.carousel-content__image img, .carousel-content__image picture, img');

    // Derive the YouTube video id from the poster src (ytimg thumbnail).
    let videoId = slide.getAttribute('data-video-id')
      || (slide.querySelector('[data-video-id]') && slide.querySelector('[data-video-id]').getAttribute('data-video-id'))
      || null;
    if (!videoId) {
      const posterSrc = poster ? (poster.getAttribute('src') || '') : '';
      const ytMatch = posterSrc.match(/\/vi\/([^/]+)\//);
      if (ytMatch) videoId = ytMatch[1];
    }
    if (!poster && !videoId) return;

    // Skip duplicate slides (source repeats the cell for nav thumbnails).
    if (videoId) {
      if (seenVideoIds.has(videoId)) return;
      seenVideoIds.add(videoId);
    }

    // Cell 1: the poster image (mandatory).
    const imageCell = poster || '';

    // Cell 2: title + description + CTA link (video watch URL).
    const content = [];
    const titleEl = slide.querySelector('.carousel-content__description .title, .carousel-content__title, h1, h2, h3, h4');
    if (titleEl && titleEl.textContent.trim()) {
      const h = document.createElement('h3');
      h.textContent = titleEl.textContent.trim();
      content.push(h);
    }
    const descEl = slide.querySelector('.carousel-content__description .text, .carousel-content__description p');
    if (descEl && descEl.textContent.trim()) {
      const p = document.createElement('p');
      p.textContent = descEl.textContent.trim();
      content.push(p);
    }
    if (videoId) {
      const href = `https://www.youtube.com/watch?v=${videoId}`;
      const link = document.createElement('a');
      link.href = href;
      link.textContent = href;
      content.push(link);
    }

    rows.push([imageCell, content]);
  });

  if (!rows.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel', cells: rows });
  element.replaceWith(block);
}
