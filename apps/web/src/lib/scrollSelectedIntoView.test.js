import { describe, it, expect, vi } from 'vitest';
import { findRowElement, scrollSelectedIntoView } from './scrollSelectedIntoView.js';

function makeRoot(id) {
  const root = document.createElement('div');
  const row = document.createElement('div');
  row.setAttribute('data-row-id', id);
  root.appendChild(row);
  return { root, row };
}

describe('findRowElement', () => {
  it('finds the row tagged with the given id', () => {
    const { root, row } = makeRoot('p1');
    expect(findRowElement('p1', root)).toBe(row);
  });

  it('returns null for an id that is not in the root, or a missing id or root', () => {
    const { root } = makeRoot('p1');
    expect(findRowElement('missing', root)).toBe(null);
    expect(findRowElement(null, root)).toBe(null);
    expect(findRowElement('p1', null)).toBe(null);
  });

  it('escapes an id that would otherwise break the selector', () => {
    const { root, row } = makeRoot('weird"id');
    expect(findRowElement('weird"id', root)).toBe(row);
  });
});

describe('scrollSelectedIntoView', () => {
  it('scrolls the matching row to the nearest edge when the browser supports it', () => {
    const { root, row } = makeRoot('p1');
    row.scrollIntoView = vi.fn();
    scrollSelectedIntoView('p1', root);
    expect(row.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
  });

  // jsdom has no scrollIntoView at all, unlike every real browser.
  it('does not throw where scrollIntoView does not exist', () => {
    const { root } = makeRoot('p1');
    expect(() => scrollSelectedIntoView('p1', root)).not.toThrow();
  });

  it('does nothing when nothing matches', () => {
    const { root } = makeRoot('p1');
    expect(() => scrollSelectedIntoView('missing', root)).not.toThrow();
  });
});
