// The area under the chrome where side panels float. The chat panel and the
// job pane sit OVER the feed rather than beside it, so opening either never
// reflows the list or the grid under the reader's eye. Both are anchored to
// this one element instead of to the window, because the chrome above it is
// not a fixed height: a second row of filter chips pushes it down, and a
// panel pinned at a guessed offset would cover them.
//
// The pane is rendered deep inside the feed, so it reaches this element by
// portal; the chat panel is rendered beside it in Shell and needs no portal.
export const OVERLAY_HOST_ID = 'feed-overlay-host';

// Null on the very first render, before the host is in the document, and in
// any test that renders a component without Shell around it: the caller
// renders in place then, which is still correct, only not floating.
export function overlayHost(doc = globalThis.document) {
  return doc?.getElementById(OVERLAY_HOST_ID) ?? null;
}
