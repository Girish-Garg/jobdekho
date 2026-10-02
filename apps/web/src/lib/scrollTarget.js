// Which box scrolls when a section is brought to the top, and where it ends
// up, worked out the way scrollIntoView({ block: 'start' }) works it out, so a
// glide lands exactly where the instant jump did. Worked out rather than
// asked: asking would mean making the jump first and putting the page back.

// Computed lengths come back in pixels; 'auto' (an unset scroll-padding) and
// anything else mean none.
const px = (value) => (String(value).endsWith('px') ? parseFloat(value) : 0);

// jsdom and old engines have no scrollingElement; the root element is what
// scrolls the page in standards mode, which is the only mode the app runs in.
const pageScroller = (doc) => doc.scrollingElement ?? doc.documentElement;

// The nearest ancestor that really scrolls. In the app that is <main>, since
// the window does not scroll at all; the page's own scroller is the answer
// only where nothing between the section and the page does.
export function scrollParent(el, view) {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = view.getComputedStyle(node);
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node;
  }
  return pageScroller(el.ownerDocument);
}

// The scrollTop that puts the section's top edge, less its scroll-margin-top,
// at the top of the box's visible area, less the box's scroll-padding-top.
// Clamped to what the box can scroll: a last section that cannot reach the
// top is where the page runs out, and a glide aimed past that would be cut
// short by the browser mid-ease instead of settling onto its end.
export function landingTop(el, box, view) {
  // The page's own scroller reports its top as it scrolls away, while its
  // visible area always starts at the top of the window.
  const edge = box === pageScroller(el.ownerDocument) ? 0 : box.getBoundingClientRect().top + box.clientTop;
  const margin = px(view.getComputedStyle(el).scrollMarginTop);
  const padding = px(view.getComputedStyle(box).scrollPaddingTop);
  const wanted = box.scrollTop + el.getBoundingClientRect().top - edge - margin - padding;
  return Math.min(Math.max(0, wanted), box.scrollHeight - box.clientHeight);
}
