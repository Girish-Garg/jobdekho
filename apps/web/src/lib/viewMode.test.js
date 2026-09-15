import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { KEY, MODES, readViewMode, writeViewMode, useViewMode } from './viewMode.js';

const storage = (value) => ({ getItem: () => value, setItem: vi.fn() });

beforeEach(() => window.localStorage.clear());

describe('readViewMode', () => {
  it('reads a stored mode and falls back to rows', () => {
    expect(readViewMode(storage('grid'))).toBe('grid');
    expect(readViewMode(storage(null))).toBe('list');
    expect(readViewMode(storage('cards'))).toBe('list');
  });

  // A browser set to block site data throws on access rather than returning
  // null, and the view is not worth failing a render over.
  it('survives storage that throws', () => {
    expect(readViewMode({ getItem: () => { throw new Error('blocked'); } })).toBe('list');
    expect(() => writeViewMode('grid', { setItem: () => { throw new Error('blocked'); } })).not.toThrow();
  });

  it('writes under the key', () => {
    const store = storage(null);
    writeViewMode('grid', store);
    expect(store.setItem).toHaveBeenCalledWith(KEY, 'grid');
  });
});

describe('MODES', () => {
  it('lists rows before cards, matching the default', () => {
    expect(MODES).toEqual(['list', 'grid']);
  });
});

describe('useViewMode', () => {
  it('defaults to list and persists a pick across the hook instance', () => {
    const { result } = renderHook(() => useViewMode());
    expect(result.current[0]).toBe('list');
    act(() => result.current[1]('grid'));
    expect(result.current[0]).toBe('grid');
    expect(window.localStorage.getItem(KEY)).toBe('grid');
  });
});
