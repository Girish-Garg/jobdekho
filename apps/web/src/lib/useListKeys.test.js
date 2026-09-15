import { describe, it, expect, vi } from 'vitest';
import { renderHook, fireEvent } from '@testing-library/react';
import { useListKeys } from './useListKeys.js';

const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

function setup(selectedId = null) {
  const handlers = { onSelect: vi.fn(), onOpen: vi.fn(), onStatus: vi.fn(), onUndo: vi.fn(), onClear: vi.fn() };
  const view = renderHook((props) => useListKeys({ rows, selectedId, ...handlers, ...props }));
  return { ...handlers, view };
}

const press = (key, opts = {}) => fireEvent.keyDown(document, { key, ...opts });

describe('useListKeys movement', () => {
  it('moves to the first row on the first j or ArrowDown with nothing selected', () => {
    const a = setup(null);
    press('j');
    expect(a.onSelect).toHaveBeenCalledWith('a');
  });

  it('moves forward with j and back with k, clamped to the ends', () => {
    const forward = setup('a');
    press('j');
    expect(forward.onSelect).toHaveBeenCalledWith('b');

    const backward = setup('a');
    press('k');
    expect(backward.onSelect).toHaveBeenCalledWith('a');
  });

  it('answers to the arrow keys the same way as j/k', () => {
    const down = setup('a');
    press('ArrowDown');
    expect(down.onSelect).toHaveBeenCalledWith('b');

    const up = setup('c');
    press('ArrowUp');
    expect(up.onSelect).toHaveBeenCalledWith('b');
  });

  it('does nothing when the feed is empty', () => {
    const handlers = { onSelect: vi.fn(), onOpen: vi.fn(), onStatus: vi.fn(), onUndo: vi.fn(), onClear: vi.fn() };
    renderHook(() => useListKeys({ rows: [], selectedId: null, ...handlers }));
    press('j');
    expect(handlers.onSelect).not.toHaveBeenCalled();
  });
});

describe('useListKeys actions', () => {
  it('opens the selected row on Enter, and does nothing with no selection', () => {
    const selected = setup('b');
    press('Enter');
    expect(selected.onOpen).toHaveBeenCalledWith('b');

    const none = setup(null);
    press('Enter');
    expect(none.onOpen).not.toHaveBeenCalled();
  });

  it('clears the selection on Escape', () => {
    const a = setup('b');
    press('Escape');
    expect(a.onClear).toHaveBeenCalled();
  });

  it('undoes on u regardless of selection', () => {
    const a = setup(null);
    press('u');
    expect(a.onUndo).toHaveBeenCalled();
  });

  it('sets saved, applied and dismissed on s, a and d for the selected row', () => {
    const a = setup('a');
    press('s');
    press('a');
    press('d');
    expect(a.onStatus).toHaveBeenNthCalledWith(1, 'a', 'saved');
    expect(a.onStatus).toHaveBeenNthCalledWith(2, 'a', 'applied');
    expect(a.onStatus).toHaveBeenNthCalledWith(3, 'a', 'dismissed');
  });

  it('does not act on s/a/d with no row selected', () => {
    const a = setup(null);
    press('s');
    expect(a.onStatus).not.toHaveBeenCalled();
  });
});

describe('useListKeys guards', () => {
  it('ignores every bound key while an input, textarea or select has focus', () => {
    const a = setup('a');
    const input = document.createElement('input');
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: 'j' });
    fireEvent.keyDown(input, { key: 's' });
    expect(a.onSelect).not.toHaveBeenCalled();
    expect(a.onStatus).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('ignores a key chorded with a modifier, so it never fights a browser or chrome-agent shortcut', () => {
    const a = setup('a');
    press('k', { ctrlKey: true });
    press('s', { metaKey: true });
    expect(a.onSelect).not.toHaveBeenCalled();
    expect(a.onStatus).not.toHaveBeenCalled();
  });

  it('detaches its listener on unmount', () => {
    const a = setup('a');
    a.view.unmount();
    press('j');
    expect(a.onSelect).not.toHaveBeenCalled();
  });

  it('attaches no listener at all when disabled', () => {
    const handlers = { onSelect: vi.fn(), onOpen: vi.fn(), onStatus: vi.fn(), onUndo: vi.fn(), onClear: vi.fn() };
    renderHook(() => useListKeys({ rows, selectedId: 'a', ...handlers, enabled: false }));
    press('j');
    expect(handlers.onSelect).not.toHaveBeenCalled();
  });
});
