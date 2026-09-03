/*
 * Video block — a poster image with a centred circular play button that
 * lazy-loads the actual video on click. Migrated from the source
 * `div.galleryvideoplayer .video-gallery.single-slide` player.
 *
 * WHY LAZY: the source never eager-loads the player iframe/video — it shows a
 * lightweight poster and only injects the heavy embed after the user clicks.
 * Eager-loading four YouTube iframes across the traits pages tanks performance
 * (and was the "video not loading properly" bug), so we replicate the click-to-
 * load behaviour here.
 *
 * CONTENT MODEL (author-friendly — one cell)
 *   | Video                                                        |
 *   | <poster image> + a link to the video (YouTube URL/id or a    |
 *   | Dynamic Media video-serve URL)                               |
 *
 *   The single cell holds an optional poster <img>/<picture> above a link
 *   whose href is the video source. Accepted sources:
 *     - a YouTube watch/embed/short URL, or a bare 11-char YouTube id
 *       → plays via https://www.youtube.com/embed/<id>?autoplay=1 (iframe)
 *     - a Dynamic Media video-serve URL (assets.vylor.com/is/content/…)
 *       → plays via a native <video> element with that URL as src
 *
 *   If no poster is authored we fall back to the YouTube maxres thumbnail.
 *
 * VARIANTS: only the single-video player is implemented (the traits pages use
 * the `video-gallery single-slide` player). The source also has a multi-video
 * carousel variant (`video-gallery` with multiple cells + prev/next controls);
 * that is NOT present on these pages and is left for future extension — it would
 * live here as a `.video.carousel` variant.
 */

/** Extract an 11-char YouTube id from a watch/embed/short URL or bare id. */
function youtubeId(raw) {
  if (!raw) return '';
  const s = raw.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtube\.com\/(?:embed\/|watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : '';
}

/** True for a Dynamic Media video-serve URL (assets.vylor.com/is/content/…). */
function isDynamicMediaVideo(url) {
  return /\/is\/content\//.test(url);
}

/**
 * Build the play button — a 120px transparent button carrying a white circle
 * (::before) and a navy play triangle (::after) via CSS, matching the source.
 */
function buildPlayButton() {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'video-play-btn';
  btn.setAttribute('aria-label', 'Play video');
  return btn;
}

export default async function decorate(block) {
  // ---- Read the authored cell: poster image + video source link/text. ----
  const posterSrc = block.querySelector('picture source, img')
    ? (block.querySelector('img')?.getAttribute('src') || '')
    : '';
  const posterPicture = block.querySelector('picture');
  const link = block.querySelector('a[href]');
  const rawUrl = (link?.getAttribute('href') || block.textContent || '').trim();

  // Optional overlay content: a heading (title) + paragraph(s) authored after the
  // video link (e.g. soybean-traits "MAKE THE RIGHT MOVE"). Live overlays these
  // on the poster. Captured before the block is cleared; absent on plain players.
  const overlayHeading = block.querySelector('h1, h2, h3, h4, h5, h6');
  const overlayParas = [...block.querySelectorAll('p')]
    .filter((p) => !p.querySelector('picture, img, a') && p.textContent.trim());

  const ytId = youtubeId(rawUrl);
  const isDM = !ytId && isDynamicMediaVideo(rawUrl);

  // Nothing embeddable → leave the block empty (graceful no-op).
  if (!ytId && !isDM) {
    block.textContent = '';
    return;
  }

  // ---- Build the poster + play-button facade. ----
  const facade = document.createElement('div');
  facade.className = 'video-facade';

  const poster = document.createElement('img');
  poster.className = 'video-poster';
  poster.loading = 'lazy';
  poster.decoding = 'async';
  poster.alt = '';
  if (posterPicture && posterPicture.querySelector('img')) {
    poster.src = posterPicture.querySelector('img').getAttribute('src');
  } else if (posterSrc) {
    poster.src = posterSrc;
  } else if (ytId) {
    poster.src = `https://i.ytimg.com/vi/${ytId}/maxresdefault.jpg`;
  }

  const btn = buildPlayButton();
  facade.append(poster, btn);

  block.textContent = '';
  block.append(facade);

  // Overlay title + description (matches live's single-slide galleryvideoplayer
  // `.carousel-content__description` block). Rendered as a SIBLING of the facade
  // so video.css can lay it over the poster on desktop (position:absolute) but
  // let it flow beneath as dark text on mobile — exactly what live does. Only
  // built when the source authored them; the block gets `has-overlay` and the
  // facade gets the scrim marker for the desktop gradient.
  if (overlayHeading || overlayParas.length) {
    block.classList.add('has-overlay');
    facade.classList.add('has-overlay');
    const overlay = document.createElement('div');
    overlay.className = 'video-overlay';
    if (overlayHeading) {
      const h = document.createElement('h3');
      h.className = 'video-overlay-title';
      h.textContent = overlayHeading.textContent.trim();
      overlay.append(h);
    }
    overlayParas.forEach((p) => {
      const para = document.createElement('p');
      para.className = 'video-overlay-desc';
      para.textContent = p.textContent.trim();
      overlay.append(para);
    });
    block.append(overlay);
  }

  // ---- Click / keyboard: swap the facade for the real player. ----
  const play = () => {
    let player;
    if (ytId) {
      player = document.createElement('iframe');
      player.src = `https://www.youtube.com/embed/${ytId}?autoplay=1`;
      player.title = 'YouTube video player';
      player.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
      player.setAttribute('allowfullscreen', 'true');
      player.setAttribute('frameborder', '0');
    } else {
      player = document.createElement('video');
      player.src = rawUrl;
      player.setAttribute('controls', '');
      player.setAttribute('autoplay', '');
      player.setAttribute('playsinline', '');
    }
    player.className = 'video-player';
    facade.replaceWith(player);
    // Drop the poster overlay (title/description + scrim) once playing.
    block.querySelector('.video-overlay')?.remove();
    block.classList.remove('has-overlay');
    if (player.tagName === 'VIDEO') player.play?.().catch(() => {});
  };

  btn.addEventListener('click', play);
}
