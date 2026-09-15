// Both view modes tag their row's DOM node with data-row-id, so one lookup
// serves the list and the grid, and the keyboard opener that has no clicked
// element of its own to remember focus from.
export function findRowElement(id, root = globalThis.document) {
  if (id == null || !root?.querySelector) return null;
  return root.querySelector(`[data-row-id="${CSS.escape(String(id))}"]`);
}

export function scrollSelectedIntoView(id, root) {
  // jsdom has no scrollIntoView at all, unlike every real browser; the
  // optional call keeps this a no-op there instead of a thrown TypeError.
  findRowElement(id, root)?.scrollIntoView?.({ block: 'nearest' });
}
