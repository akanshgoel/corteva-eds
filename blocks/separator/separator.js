/*
 * Separator block — Hoegemeyer.
 *
 * Faithful reproduction of the source site's AEM Core "separator" component.
 * The source renders a horizontal rule inside a two-level wrapper, and the
 * visual style is chosen by a modifier class on the outer element:
 *
 *   <div class="separator cmp-separator--bold">
 *     <div class="cmp-separator">
 *       <hr class="cmp-separator__horizontal-rule">
 *     </div>
 *   </div>
 *
 * We reproduce that exact DOM (and the `cmp-separator*` class names) so the
 * CSS maps 1:1 with the original, then let authors pick a style via the EDS
 * block variant classes.
 *
 * Authoring (block name: Separator). The block has no content — it is authored
 * as an empty block. The style is selected with a block variant. Only the two
 * styles used on the source site are supported:
 *   - (default)   a plain browser <hr> (1px inset rule)
 *   - bold        thick 5px brand-blue rule (the site's primary usage)
 *
 * Any authored content is ignored — only the rule is rendered.
 */

// EDS variant class -> source Core Component modifier class. Adding the cmp
// modifier onto the block lets us reuse the source's exact CSS selectors.
const VARIANT_MODIFIERS = {
  bold: 'cmp-separator--bold',
};

/**
 * loads and decorates the separator
 * @param {Element} block The separator block element
 */
export default function decorate(block) {
  // Map any authored EDS variant classes to their source cmp-separator--*
  // equivalents so the styling matches the original component exactly.
  Object.entries(VARIANT_MODIFIERS).forEach(([variant, modifier]) => {
    if (block.classList.contains(variant)) block.classList.add(modifier);
  });

  // Build the source's inner structure: <div.cmp-separator> > <hr>.
  const inner = document.createElement('div');
  inner.className = 'cmp-separator';
  const rule = document.createElement('hr');
  rule.className = 'cmp-separator__horizontal-rule';
  inner.append(rule);

  // The separator carries no authored content — replace whatever is there.
  block.replaceChildren(inner);
}
