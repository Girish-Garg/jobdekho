import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { draftFor, keepDraft, dropDraft, useUnsavedDocuments } from './sourceDrafts.js';

// What a browser does with a beforeunload: it asks only when the event was
// cancelled or given a returnValue.
function leaving() {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

describe('sourceDrafts', () => {
  it('keeps a draft per document only while it differs from what it started from', () => {
    keepDraft('d1', 'edited', 'saved');
    expect(draftFor('d1')).toEqual({ draft: 'edited', base: 'saved' });
    expect(draftFor('d2')).toBeNull();
    keepDraft('d1', 'saved', 'saved');
    expect(draftFor('d1')).toBeNull();
  });

  it('lists the documents with unsaved edits, and drops a deleted one\'s', () => {
    const { result } = renderHook(() => useUnsavedDocuments());
    expect(result.current).toEqual([]);
    act(() => {
      keepDraft('d1', 'a', 'b');
      keepDraft('d2', 'c', 'd');
    });
    expect(result.current).toEqual(['d1', 'd2']);
    act(() => dropDraft('d1'));
    expect(result.current).toEqual(['d2']);
    expect(draftFor('d1')).toBeNull();
  });

  it('asks before the page is left only while some draft is unsaved', () => {
    expect(leaving()).toBe(false);
    keepDraft('d1', 'edited', 'saved');
    expect(leaving()).toBe(true);
    keepDraft('d1', 'saved', 'saved');
    expect(leaving()).toBe(false);
  });
});
