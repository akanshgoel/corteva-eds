/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-about-page.js
  var import_about_page_exports = {};
  __export(import_about_page_exports, {
    default: () => import_about_page_default
  });

  // tools/importer/parsers/teaser.js
  function parse(element, { document }) {
    const image = element.querySelector(".cmp-teaser__image picture, .cmp-teaser__image img, picture, img");
    const heading = element.querySelector(".cmp-teaser__title, h1, h2, h3, h4, h5, h6");
    if (!image && !heading) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    if (image) cells.push([image]);
    if (heading) cells.push([heading]);
    const block = WebImporter.Blocks.createBlock(document, { name: "teaser (hero-l2)", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/carousel.js
  function parse2(element, { document }) {
    const rows = [];
    let slides;
    if (element.classList.contains("single-slide")) {
      slides = [element];
    } else {
      const contentSlides = element.querySelector(".video-gallery__content-slides");
      const scope = contentSlides || element;
      const cells = scope.querySelectorAll(".video-gallery__carousel-cell");
      slides = cells.length ? [...cells] : [element];
    }
    const seenVideoIds = /* @__PURE__ */ new Set();
    slides.forEach((slide) => {
      const poster = slide.querySelector(".carousel-content__image img, .carousel-content__image picture, img");
      let videoId = slide.getAttribute("data-video-id") || slide.querySelector("[data-video-id]") && slide.querySelector("[data-video-id]").getAttribute("data-video-id") || null;
      if (!videoId) {
        const posterSrc = poster ? poster.getAttribute("src") || "" : "";
        const ytMatch = posterSrc.match(/\/vi\/([^/]+)\//);
        if (ytMatch) videoId = ytMatch[1];
      }
      if (!poster && !videoId) return;
      if (videoId) {
        if (seenVideoIds.has(videoId)) return;
        seenVideoIds.add(videoId);
      }
      const imageCell = poster || "";
      const content = [];
      const titleEl = slide.querySelector(".carousel-content__description .title, .carousel-content__title, h1, h2, h3, h4");
      if (titleEl && titleEl.textContent.trim()) {
        const h = document.createElement("h3");
        h.textContent = titleEl.textContent.trim();
        content.push(h);
      }
      const descEl = slide.querySelector(".carousel-content__description .text, .carousel-content__description p");
      if (descEl && descEl.textContent.trim()) {
        const p = document.createElement("p");
        p.textContent = descEl.textContent.trim();
        content.push(p);
      }
      if (videoId) {
        const href = `https://www.youtube.com/watch?v=${videoId}`;
        const link = document.createElement("a");
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
    const block = WebImporter.Blocks.createBlock(document, { name: "carousel", cells: rows });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns.js
  function parse3(element, { document }) {
    let ratio = "";
    const cls = element.className || "";
    const ratioMatch = cls.match(/wrapper--([\d-]+)/);
    if (ratioMatch) ratio = ratioMatch[1];
    const columns = Array.from(element.querySelectorAll(":scope > .column-control__column"));
    if (!columns.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const row = columns.map((col) => {
      const contentCell = [];
      const contentRoot = col.querySelector(".cmp-text") || col.querySelector(".richtext") || col;
      const nodes = Array.from(contentRoot.querySelectorAll("img, picture, h1, h2, h3, h4, h5, h6, p")).filter((n) => !(n.tagName === "P" && n.querySelector("img, picture")));
      const ordered = [];
      Array.from(contentRoot.querySelectorAll("img, picture, h1, h2, h3, h4, h5, h6, p")).forEach((n) => {
        if (n.tagName === "P" && n.querySelector("img, picture")) {
          ordered.push(n.querySelector("picture") || n.querySelector("img"));
        } else if (nodes.includes(n)) {
          ordered.push(n);
        }
      });
      ordered.forEach((n) => contentCell.push(n));
      if (!contentCell.length) contentCell.push(...contentRoot.childNodes);
      return contentCell;
    });
    const cells = [row];
    const name = ratio ? `columns (${ratio})` : "columns";
    const block = WebImporter.Blocks.createBlock(document, { name, cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/hoegemeyer-cleanup.js
  var H = { before: "beforeTransform", after: "afterTransform" };
  function transform(hookName, element, payload) {
    if (hookName === H.before) {
      WebImporter.DOMUtils.remove(element, [
        // Global header/footer chrome (each wrapped in an experience fragment).
        // EDS supplies its own header/footer, so these are not page content.
        ".globalheader",
        ".globalfooter",
        ".cmp-experiencefragment",
        // Auto-generated breadcrumb chrome (div.social-share wrapper).
        ".social-share",
        // TrustArc cookie-consent band ("Corteva Cookie Policy …") — injected
        // shell UI, not present as content on the live site.
        "#consent_blackbar",
        ".consent_blackbar",
        '[class*="truste"]'
      ]);
    }
    if (hookName === H.after) {
      WebImporter.DOMUtils.remove(element, ["meta", "source", "noscript", "link"]);
    }
  }

  // tools/importer/transformers/hoegemeyer-dm-images.js
  function detectDynamicMediaUrl(urlStr) {
    let u;
    try {
      u = new URL(urlStr, "https://x/");
    } catch (e) {
      return false;
    }
    if (u.pathname.startsWith("/is/image/")) {
      return "scene7";
    }
    if (/^delivery-p\d+-e\d+\.adobeaemcloud\.com$/.test(u.hostname) && u.pathname.startsWith("/adobe/assets/urn:")) {
      return "dm-openapi";
    }
    return false;
  }
  var LINKED_DM_INLINE_WRAPPER_TAGS = /* @__PURE__ */ new Set(["PICTURE"]);
  var LINKED_DM_WRAPPER_SIBLING_TAGS = /* @__PURE__ */ new Set(["SOURCE"]);
  function findLinkedDmCarrier(img) {
    if (!img || !img.parentElement) return null;
    let node = img;
    let parent = img.parentElement;
    while (parent && LINKED_DM_INLINE_WRAPPER_TAGS.has(parent.tagName)) {
      let foundNode = false;
      for (const child of parent.children) {
        if (child === node) {
          foundNode = true;
        } else if (!LINKED_DM_WRAPPER_SIBLING_TAGS.has(child.tagName)) {
          return null;
        }
      }
      if (!foundNode) return null;
      node = parent;
      parent = parent.parentElement;
    }
    if (!parent || parent.tagName !== "A") return null;
    if (parent.children.length !== 1 || parent.children[0] !== node) return null;
    if (parent.textContent.trim() !== "") return null;
    return parent;
  }
  var EMPTY_ALT_SENTINEL = "Image without alt text";
  function altToLinkText(alt) {
    return alt || EMPTY_ALT_SENTINEL;
  }
  function transform2(hookName, element, payload) {
    if (hookName !== "afterTransform") return;
    const doc = element.ownerDocument;
    element.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src") || "";
      if (!detectDynamicMediaUrl(src)) return;
      const alt = img.getAttribute("alt") || "";
      const linkedAnchor = findLinkedDmCarrier(img);
      if (linkedAnchor) {
        linkedAnchor.setAttribute("title", src);
        linkedAnchor.textContent = altToLinkText(alt);
        return;
      }
      const parent = img.parentElement;
      if (parent && parent.tagName === "A") {
        console.warn("DM image inside mixed-content anchor, skipped:", src);
        return;
      }
      const a = doc.createElement("a");
      a.href = src;
      a.textContent = altToLinkText(alt);
      img.replaceWith(a);
    });
  }

  // tools/importer/transformers/hoegemeyer-sections.js
  var H2 = { before: "beforeTransform", after: "afterTransform" };
  function classify(el) {
    var _a;
    if (el.tagName === "TABLE") {
      const head = (((_a = el.querySelector("td, th")) == null ? void 0 : _a.textContent) || "").toLowerCase();
      if (head.includes("teaser")) return "teaser";
      if (head.includes("carousel")) return "carousel";
      if (head.includes("columns")) return head.includes("50-50") ? "timeline" : "cols3";
      if (head.includes("metadata")) return "skip";
      return "block";
    }
    return "text";
  }
  function transform3(hookName, element, payload) {
    if (hookName !== H2.after) return;
    const main = element;
    const doc = main.ownerDocument;
    const items = [...main.querySelectorAll("table, h1, h2, h3, h4, h5, h6, p, ul, ol")].filter((el) => el.tagName === "TABLE" ? true : !el.closest("table")).map((el) => ({ el, type: classify(el) })).filter((it) => it.type !== "skip");
    if (items.length < 2) return;
    const sections = [];
    let cur = null;
    items.forEach(({ el, type }) => {
      const mergeable = type === "timeline" || type === "text";
      if (!cur || !(mergeable && cur.type === type)) {
        cur = { type, els: [] };
        sections.push(cur);
      }
      cur.els.push(el);
    });
    if (sections.length < 2) return;
    const makeMetadata = (styleValue) => {
      const meta = doc.createElement("table");
      const head = doc.createElement("tr");
      const th = doc.createElement("td");
      th.textContent = "Section Metadata";
      head.append(th);
      const row = doc.createElement("tr");
      const k = doc.createElement("td");
      k.textContent = "Style";
      const v = doc.createElement("td");
      v.textContent = styleValue;
      row.append(k, v);
      meta.append(head, row);
      return meta;
    };
    sections.forEach((section, i) => {
      const first = section.els[0];
      const last = section.els[section.els.length - 1];
      if (i > 0 && first.parentNode) {
        first.parentNode.insertBefore(doc.createElement("hr"), first);
      }
      if (section.type === "text" && last.parentNode) {
        last.parentNode.insertBefore(makeMetadata("text-center"), last.nextSibling);
      }
    });
  }

  // tools/importer/import-about-page.js
  var parsers = {
    teaser: parse,
    carousel: parse2,
    columns: parse3
  };
  var transformers = [
    transform,
    transform2,
    transform3
  ];
  var PAGE_TEMPLATE = {
    name: "about-page",
    description: "About page: hero teaser, intro copy, embedded video, three-up value columns, and a vertical timeline of two-column milestone rows.",
    urls: [
      "https://www.hoegemeyer.com/about.html"
    ],
    blocks: [
      {
        name: "teaser",
        instances: [".teaser.cmp-teaser--hero-l2"],
        section: "hero-l2"
      },
      {
        name: "carousel",
        instances: [".galleryvideoplayer .video-gallery"]
      },
      {
        name: "columns",
        instances: [".column-control-cmp__wrapper--33-33-33", ".column-control__wrapper--33-33-33"],
        section: "33-33-33"
      },
      {
        name: "columns",
        instances: [".column-control-cmp__wrapper--50-50"],
        section: "50-50"
      }
    ]
  };
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), { template: PAGE_TEMPLATE });
    transformers.forEach((transformerFn) => {
      try {
        transformerFn.call(null, hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
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
            section: blockDef.section || null
          });
        });
      });
    });
    console.log(`Found ${pageBlocks.length} block instances on page`);
    return pageBlocks;
  }
  var import_about_page_default = {
    transform: (payload) => {
      const { document, url, params } = payload;
      const main = document.body;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
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
      executeTransformers("afterTransform", main, payload);
      const hr = document.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document);
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(rawPath === "" ? "/index" : rawPath);
      return [{
        element: main,
        path,
        report: {
          title: document.title,
          template: PAGE_TEMPLATE.name,
          blocks: pageBlocks.map((b) => b.name)
        }
      }];
    }
  };
  return __toCommonJS(import_about_page_exports);
})();
