/*
 * Carousel (Video Gallery) block — Hoegemeyer.
 *
 * Faithful reproduction of the source site's "galleryvideoplayer" / video-gallery:
 * a poster image with a centered play button that lazily loads a video (YouTube
 * OR Adobe Scene7 / Dynamic Media), an optional overlaid title + description,
 * and — when more than one slide is authored — a bottom thumbnail strip (image +
 * title + duration) plus prev/next controls and a slide counter.
 *
 * Output DOM (class names mirror the source so styling maps 1:1):
 *   .carousel[.non-bleed][.text-bottom]
 *   └─ .video-gallery[.single-slide]
 *      ├─ h2                                   (optional gallery heading)
 *      ├─ .video-gallery__content-slides       main slide viewport
 *      │  └─ .video-gallery__carousel-cell[.is-selected] (× N)
 *      │     ├─ .carousel-content
 *      │     │  └─ .carousel-content__data
 *      │     │     ├─ .carousel-content__image        poster + dark overlay
 *      │     │     └─ .carousel-content__description-wrapper
 *      │     │        └─ .carousel-content__description
 *      │     │           ├─ .carousel-content__description-left  (title/text + prev/count/next)
 *      │     │           └─ .carousel-content__description-right (play button)
 *      │     └─ .carousel-content__description-left-mobile        (title/text, mobile)
 *      └─ .video-gallery__carousel-nav          bottom thumbnail strip (multi only)
 *         ├─ button.video-gallery__nav-arrow.prev
 *         ├─ .video-gallery__carousel-track
 *         │  └─ .video-gallery__carousel-cell[.is-nav-selected] (× N)
 *         │     └─ a.video-gallery__carousel-thumb
 *         │        ├─ .video-gallery__carousel-thumb-image (thumb + small play)
 *         │        ├─ p     (title)
 *         │        └─ span  (duration)
 *         └─ button.video-gallery__nav-arrow.next
 *
 * Authoring (block name: Carousel). One row per slide; cells are detected by
 * content, so order is flexible:
 *   - Video    : a link or plain text — a YouTube URL/ID or a Scene7
 *                (…/is/content/…) video URL. REQUIRED per slide.
 *   - Poster   : an image. Optional for YouTube (derived from the video id);
 *                REQUIRED for Scene7/other, which have no derivable thumbnail.
 *   - Content  : a cell with a heading (title) and/or paragraphs (description).
 *   - Duration : a short cell like "2:30" (shown under the thumbnail). Optional.
 *
 * A row with no video but a heading is used as the gallery's <h2> heading.
 *
 * Variants (block classes): `non-bleed` (contained width) and `text-bottom`
 * (title/text below the video instead of overlaid).
 */

const YT_THUMB = (id) => `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;

/**
 * Creates an element with an optional class and innerHTML.
 * @param {string} tag
 * @param {string} [className]
 * @param {string} [html]
 * @returns {HTMLElement}
 */
function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html != null) node.innerHTML = html;
  return node;
}

// Inline SVGs (the source uses an icomoon icon font we don't have; these are
// visual equivalents). Triangle/chevrons inherit colour via currentColor.
// Main play triangle — fills its box (matches the source icon-font glyph, a
// large triangle inside the white disc). Sizing/centering handled in CSS.
const PLAY_ICON = '<svg class="carousel-play-icon" viewBox="0 0 16 18" aria-hidden="true" focusable="false"><path d="M0 0v18l16-9z"/></svg>';
// Thumbnail play glyph — a filled disc with a white triangle (matches the
// source's video-thumb-play-button.svg on each nav thumbnail).
const THUMB_PLAY_ICON = '<svg class="carousel-thumb-play-icon" viewBox="0 0 44 44" aria-hidden="true" focusable="false"><circle cx="22" cy="22" r="22" fill="rgba(0,0,0,0.55)"/><path d="M17 14v16l13-8z" fill="#fff"/></svg>';
// Slim chevrons matching live's icomoon glyphs (\e912 / \e911): a thin single
// stroke, rendered white at ~2.5rem in the bottom-right control row.
const CHEVRON_PREV = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHEVRON_NEXT = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/**
 * Parses an author-supplied video reference into a typed descriptor.
 * @param {string} raw the URL or id
 * @returns {{type:string, id?:string, src?:string}|null}
 */
function parseVideo(raw) {
  const s = (raw || '').trim();
  if (!s) return null;
  // Scene7 / Adobe Dynamic Media (e.g. assets.vylor.com/is/content/…)
  if (/\/is\/content\//i.test(s) || /scene7|assets\.vylor\.com/i.test(s)) {
    return { type: 'scene7', src: s };
  }
  // YouTube watch / short / embed URL
  const m = s.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]{11})/);
  if (m) return { type: 'youtube', id: m[1] };
  // Bare 11-char YouTube id
  if (/^[\w-]{11}$/.test(s)) return { type: 'youtube', id: s };
  // Any other absolute URL — treated as a direct/HLS video file
  if (/^https?:\/\//.test(s)) return { type: 'file', src: s };
  return null;
}

/**
 * Finds the cell that holds the video reference and returns its parsed value.
 * @param {Element[]} cells
 * @returns {{video:object, cell:Element}|null}
 */
function findVideo(cells) {
  let result = null;
  cells.some((cell) => {
    const link = cell.querySelector('a[href]');
    const candidate = link ? link.getAttribute('href') : cell.textContent;
    const video = parseVideo(candidate);
    if (video) {
      result = { video, cell };
      return true;
    }
    return false;
  });
  return result;
}

/**
 * Builds a <picture>/<img> poster element for a slide.
 * @param {Element|null} imageCell the cell containing an authored image
 * @param {object} video parsed video descriptor
 * @param {string} alt
 * @returns {Element|null}
 */
function buildPoster(imageCell, video, alt) {
  const authored = imageCell && (imageCell.querySelector('picture') || imageCell.querySelector('img'));
  if (authored) {
    const pic = authored.closest('picture') || authored;
    const img = pic.querySelector('img') || pic;
    if (alt && !img.getAttribute('alt')) img.setAttribute('alt', alt);
    return pic;
  }
  if (video.type === 'youtube') {
    const img = el('img');
    img.src = YT_THUMB(video.id);
    img.loading = 'lazy';
    img.alt = alt || '';
    // Not every video has a maxres thumbnail; fall back to hqdefault (always present).
    img.addEventListener('error', () => {
      if (!img.dataset.fallback) {
        img.dataset.fallback = '1';
        img.src = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
      }
    });
    return img;
  }
  return null;
}

/**
 * Replaces a slide's poster with the actual (autoplaying) video player.
 * @param {Element} imageWrap the .carousel-content__image element
 * @param {object} video parsed video descriptor
 * @param {string} title used for the iframe/video title
 */
function playVideo(imageWrap, video, title) {
  if (imageWrap.classList.contains('is-playing')) return;
  let player;
  if (video.type === 'youtube') {
    player = el('iframe', 'carousel-content__player');
    // Use the privacy-enhanced nocookie host and pass an explicit `origin` so
    // YouTube accepts the embed instead of showing its "Sign in to confirm
    // you're not a bot" interstitial (that challenge fires when the embed has no
    // valid origin/referrer). enablejsapi + origin is the standard robust embed.
    const origin = (typeof window !== 'undefined' && window.location && window.location.origin) || '';
    const params = new URLSearchParams({
      autoplay: '1',
      rel: '0',
      modestbranding: '1',
      playsinline: '1',
      enablejsapi: '1',
    });
    if (origin && /^https?:/.test(origin)) params.set('origin', origin);
    player.src = `https://www.youtube-nocookie.com/embed/${video.id}?${params.toString()}`;
    player.title = title || 'Video';
    player.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
    player.setAttribute('allowfullscreen', '');
    player.setAttribute('frameborder', '0');
  } else {
    // Scene7 / direct file — HTML5 video (no external SDK dependency)
    player = el('video', 'carousel-content__player');
    player.src = video.src;
    player.controls = true;
    player.autoplay = true;
    player.playsInline = true;
    player.setAttribute('preload', 'metadata');
  }
  imageWrap.classList.add('is-playing');
  imageWrap.replaceChildren(player);
}

/**
 * Extracts title + description nodes from the content cell.
 * @param {Element|null} contentCell
 * @returns {{title:string, textNodes:Element[]}}
 */
function parseContent(contentCell) {
  if (!contentCell) return { title: '', textNodes: [] };
  const heading = contentCell.querySelector('h1,h2,h3,h4,h5,h6');
  const title = heading ? heading.textContent.trim() : '';
  const textNodes = [...contentCell.children].filter((c) => c !== heading);
  // If there's no heading and the cell is just text, treat all of it as text.
  if (!heading && !textNodes.length && contentCell.textContent.trim()) {
    const p = el('p');
    p.textContent = contentCell.textContent.trim();
    return { title: '', textNodes: [p] };
  }
  return { title, textNodes };
}

/**
 * Builds the play button used in a main slide.
 * @param {object} video
 * @param {string} label
 * @returns {HTMLButtonElement}
 */
function buildPlayButton(video, label) {
  const btn = el('button', 'carousel-content__play-btn', PLAY_ICON);
  btn.type = 'button';
  btn.setAttribute('aria-label', label ? `Play video: ${label}` : 'Play video');
  return btn;
}

/**
 * loads and decorates the carousel
 * @param {Element} block the carousel block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const slides = [];
  let heading = null;

  rows.forEach((row) => {
    const cells = [...row.children];
    const found = findVideo(cells);
    if (!found) {
      // A row without a video but with a heading becomes the gallery heading.
      const h = row.querySelector('h1,h2,h3,h4,h5,h6');
      if (h && !heading) heading = h.textContent.trim();
      return;
    }
    const { video, cell: videoCell } = found;
    const remaining = cells.filter((c) => c !== videoCell);
    const imageCell = remaining.find((c) => c.querySelector('picture, img')) || null;
    const durationCell = remaining.find((c) => /^\d{1,2}:\d{2}$/.test(c.textContent.trim())) || null;
    const contentCell = remaining.find(
      (c) => c !== imageCell && c !== durationCell && c.textContent.trim(),
    ) || null;

    const { title, textNodes } = parseContent(contentCell);
    slides.push({
      video,
      title,
      textNodes,
      duration: durationCell ? durationCell.textContent.trim() : '',
      poster: buildPoster(imageCell, video, title),
    });
  });

  if (!slides.length) {
    block.replaceChildren();
    return;
  }

  const multi = slides.length > 1;

  const gallery = el('div', `video-gallery${multi ? '' : ' single-slide'}`);
  if (heading) gallery.append(el('h2', null, heading));

  const contentSlides = el('div', 'video-gallery__content-slides');
  // Inner track that holds the slides side-by-side and translates horizontally
  // so slide changes glide (a plain display swap can't animate).
  const slidesTrack = el('div', 'video-gallery__slides-track');
  contentSlides.append(slidesTrack);
  const navTrack = el('div', 'video-gallery__carousel-track');

  const cells = [];
  const navCells = [];

  slides.forEach((slide, i) => {
    // ----- main slide -----
    const image = el('div', 'carousel-content__image');
    if (slide.poster) image.append(slide.poster);

    const playBtn = buildPlayButton(slide.video, slide.title);
    playBtn.addEventListener('click', () => playVideo(image, slide.video, slide.title));

    const descLeft = el('div', 'carousel-content__description-left');
    if (slide.title) descLeft.append(el('div', 'title', slide.title));
    if (slide.textNodes.length) {
      const text = el('div', 'text');
      slide.textNodes.forEach((n) => text.append(n.cloneNode(true)));
      descLeft.append(text);
    }

    // prev / count / next live in the left description region (shown when multi)
    const buttons = el('div', 'video-gallery__buttons');
    const prev = el('button', 'prev-btn', CHEVRON_PREV);
    prev.type = 'button';
    prev.setAttribute('aria-label', 'Previous video');
    const count = el('span', 'count');
    count.setAttribute('aria-live', 'polite');
    const next = el('button', 'next-btn', CHEVRON_NEXT);
    next.type = 'button';
    next.setAttribute('aria-label', 'Next video');
    buttons.append(prev, count, next);
    descLeft.append(buttons);

    const descRight = el('div', 'carousel-content__description-right');
    descRight.append(playBtn);

    const description = el('div', 'carousel-content__description');
    description.append(descLeft, descRight);
    const descWrapper = el('div', 'carousel-content__description-wrapper');
    descWrapper.append(description);

    const data = el('div', 'carousel-content__data');
    data.append(image, descWrapper);
    const content = el('div', 'carousel-content');
    content.append(data);

    // mobile title/text (below the video)
    const mobileDesc = el('div', 'carousel-content__description-left-mobile');
    if (slide.title) mobileDesc.append(el('div', 'title', slide.title));
    if (slide.textNodes.length) {
      const text = el('div', 'text');
      slide.textNodes.forEach((n) => text.append(n.cloneNode(true)));
      mobileDesc.append(text);
    }

    const cell = el('div', `video-gallery__carousel-cell${i === 0 ? ' is-selected' : ''}`);
    cell.append(content, mobileDesc);
    slidesTrack.append(cell);
    cells.push(cell);

    // ----- thumbnail nav cell (multi only) -----
    if (multi) {
      const thumbImageInner = el('div', 'cmp-image');
      if (slide.poster) thumbImageInner.append(slide.poster.cloneNode(true));
      const thumbPlay = el('button', 'carousel-content__play-btn', THUMB_PLAY_ICON);
      thumbPlay.type = 'button';
      thumbPlay.tabIndex = -1;
      thumbPlay.setAttribute('aria-hidden', 'true');
      const thumbImage = el('div', 'video-gallery__carousel-thumb-image');
      thumbImage.append(thumbImageInner, thumbPlay);

      // Anchor kept for source-parity class names, but driven as a button
      // (no navigation) so it stays keyboard-accessible without a script URL.
      const thumb = el('a', 'video-gallery__carousel-thumb');
      thumb.setAttribute('role', 'button');
      thumb.tabIndex = 0;
      thumb.append(thumbImage);
      thumb.append(el('p', null, slide.title || ''));
      thumb.append(el('span', null, slide.duration || ''));

      const navCell = el('div', `video-gallery__carousel-cell${i === 0 ? ' is-nav-selected' : ''}`);
      navCell.append(thumb);
      navTrack.append(navCell);
      navCells.push(navCell);

      thumb.addEventListener('click', () => {
        // eslint-disable-next-line no-use-before-define
        activate(i);
      });
      thumb.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          // eslint-disable-next-line no-use-before-define
          activate(i);
        }
      });
    }
  });

  gallery.append(contentSlides);

  // ----- state / navigation -----
  let current = 0;
  const setCount = () => {
    cells.forEach((c) => {
      const cnt = c.querySelector('.count');
      if (cnt) cnt.textContent = `${current + 1} / ${slides.length}`;
    });
  };
  const activate = (index) => {
    current = (index + slides.length) % slides.length;
    // Glide the slides track to the active slide (each cell is 100% wide).
    slidesTrack.style.transform = `translateX(-${current * 100}%)`;
    cells.forEach((c, i) => c.classList.toggle('is-selected', i === current));
    navCells.forEach((c, i) => c.classList.toggle('is-nav-selected', i === current));
    setCount();
    // Keep the active thumbnail in view by scrolling ONLY the thumbnail track
    // horizontally. (scrollIntoView would scroll every ancestor incl. the
    // window, which caused the page to jump up on desktop swipe.)
    const active = navCells[current];
    if (active) {
      const target = active.offsetLeft - (navTrack.clientWidth - active.clientWidth) / 2;
      navTrack.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
    }
  };

  // wire prev/next on every slide's control row
  cells.forEach((c) => {
    c.querySelector('.prev-btn')?.addEventListener('click', () => activate(current - 1));
    c.querySelector('.next-btn')?.addEventListener('click', () => activate(current + 1));
  });

  // Touch/drag swipe on the main slide — the primary way to navigate on
  // mobile/tablet (where the arrows are hidden), matching the source's flickity
  // behaviour. Uses Pointer Events so it works for touch and mouse drag alike.
  if (multi) {
    let startX = 0;
    let startY = 0;
    let swiping = false;
    const SWIPE_THRESHOLD = 45; // px of horizontal travel to trigger a slide

    contentSlides.addEventListener('pointerdown', (e) => {
      // Don't hijack interactions with the play button or a loaded video player.
      if (e.target.closest('.carousel-content__play-btn, .carousel-content__player')) return;
      startX = e.clientX;
      startY = e.clientY;
      swiping = true;
    });
    // Suppress the browser's native image ghost-drag during a swipe (a mouse
    // drag on the poster would otherwise start a drag-and-drop and can jump the
    // page). Only matters while a swipe is in progress.
    contentSlides.addEventListener('dragstart', (e) => {
      if (swiping) e.preventDefault();
    });
    contentSlides.addEventListener('pointerup', (e) => {
      if (!swiping) return;
      swiping = false;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      // Only act on a mostly-horizontal swipe past the threshold.
      if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
      activate(dx < 0 ? current + 1 : current - 1);
    });
    contentSlides.addEventListener('pointercancel', () => { swiping = false; });
  }

  if (multi) {
    const nav = el('div', 'video-gallery__carousel-nav');
    const navPrev = el('button', 'video-gallery__nav-arrow prev', CHEVRON_PREV);
    navPrev.type = 'button';
    navPrev.setAttribute('aria-label', 'Scroll thumbnails left');
    const navNext = el('button', 'video-gallery__nav-arrow next', CHEVRON_NEXT);
    navNext.type = 'button';
    navNext.setAttribute('aria-label', 'Scroll thumbnails right');
    navPrev.addEventListener('click', () => navTrack.scrollBy({ left: -navTrack.clientWidth * 0.8, behavior: 'smooth' }));
    navNext.addEventListener('click', () => navTrack.scrollBy({ left: navTrack.clientWidth * 0.8, behavior: 'smooth' }));
    nav.append(navPrev, navTrack, navNext);
    gallery.append(nav);

    // Arrows only appear when the strip overflows; each disables at its extent
    // (mirrors the source flickity buttons, which hide with no overflow).
    const updateArrows = () => {
      const overflow = navTrack.scrollWidth - navTrack.clientWidth > 1;
      nav.classList.toggle('has-overflow', overflow);
      navPrev.disabled = navTrack.scrollLeft <= 1;
      navNext.disabled = navTrack.scrollLeft >= navTrack.scrollWidth - navTrack.clientWidth - 1;
    };
    navTrack.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    // defer until layout settles so scrollWidth is accurate
    requestAnimationFrame(updateArrows);
  }

  block.replaceChildren(gallery);
  setCount();
}
