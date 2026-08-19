/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import teaserParser from './parsers/teaser.js';
import carouselParser from './parsers/carousel.js';
import columnsParser from './parsers/columns.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/hoegemeyer-cleanup.js';
import dmImagesTransformer from './transformers/hoegemeyer-dm-images.js';
import sectionsTransformer from './transformers/hoegemeyer-sections.js';

// PARSER REGISTRY
const parsers = {
  teaser: teaserParser,
  carousel: carouselParser,
  columns: columnsParser,
};

// TRANSFORMER REGISTRY. Order matters: cleanup (strip chrome) → DM image
// rewriting → sections (group into <hr>-separated sections + alignment metadata,
// runs last so it operates on the final node set).
const transformers = [
  cleanupTransformer,
  dmImagesTransformer,
  sectionsTransformer,
];

// PAGE TEMPLATE CONFIGURATION - embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'about-page',
  description: 'About page: hero teaser, intro copy, embedded video, three-up value columns, and a vertical timeline of two-column milestone rows.',
  urls: [
    'https://www.hoegemeyer.com/about.html',
  ],
  blocks: [
    {
      name: 'teaser',
      instances: ['.teaser.cmp-teaser--hero-l2'],
      section: 'hero-l2',
    },
    {
      name: 'carousel',
      instances: ['.galleryvideoplayer .video-gallery'],
    },
    {
      name: 'columns',
      instances: ['.column-control-cmp__wrapper--33-33-33', '.column-control__wrapper--33-33-33'],
      section: '33-33-33',
    },
    {
      name: 'columns',
      instances: ['.column-control-cmp__wrapper--50-50'],
      section: '50-50',
    },
  ],
};

/**
 * Execute all page transformers for a specific hook.
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration.
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
  });
  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;

    // 1. beforeTransform cleanup
    executeTransformers('beforeTransform', main, payload);

    // 2. discover blocks
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. parse each block (skip elements already replaced by an earlier parser)
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. afterTransform cleanup + DM image rewriting
    executeTransformers('afterTransform', main, payload);

    // 5. WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. sanitized path (map root to /index to avoid empty-path crash)
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
