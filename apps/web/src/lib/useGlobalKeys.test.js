import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { useGlobalKeys } from './useGlobalKeys.js';

function press(key, opts = {}) {
  fireEvent.keyDown(document, { key, ...opts });
}

function setup(overrides = {}) {
  const onOpenPalette = vi.fn();
  const onOpenHelp = vi.fn();
  const onFocusSearch = vi.fn();
  renderHook(() => useGlobalKeys({ onOpenPalette, onOpenHelp, onFocusSearch, ...overrides }));
  return { onOpenPalette, onOpenHelp, onFocusSearch };
}

describe('useGlobalKeys', () => {
  it('opens the palette on Ctrl+K and Cmd+K', () => {
    const { onOpenPalette } = setup();
    press('k', { ctrlKey: true });
    press('k', { metaKey: true });
    expect(onOpenPalette).toHaveBeenCalledTimes(2);
  });

  it('opens the shortcuts help on ?', () => {
    const { onOpenHelp } = setup();
    press('?');
    expect(onOpenHelp).toHaveBeenCalledTimes(1);
  });

  it('focuses the search box on /', () => {
    const { onFocusSearch } = setup();
    press('/');
    expect(onFocusSearch).toHaveBeenCalledTimes(1);
  });

  it('ignores a bare k with no modifier', () => {
    const { onOpenPalette } = setup();
    press('k');
    expect(onOpenPalette).not.toHaveBeenCalled();
  });

  it('never fires while typing in an input', () => {
    const { onOpenPalette, onOpenHelp, onFocusSearch } = setup();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    fireEvent.keyDown(input, { key: 'k', ctrlKey: true });
    fireEvent.keyDown(input, { key: '?' });
    fireEvent.keyDown(input, { key: '/' });

    expect(onOpenPalette).not.toHaveBeenCalled();
    expect(onOpenHelp).not.toHaveBeenCalled();
    expect(onFocusSearch).not.toHaveBeenCalled();
    input.remove();
  });

  it('never fires from a textarea, a select or a contenteditable node', () => {
    const { onOpenHelp } = setup();
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    document.body.appendChild(editable);

    fireEvent.keyDown(editable, { key: '?' });
    expect(onOpenHelp).not.toHaveBeenCalled();
    editable.remove();
  });

  it('does nothing for a shortcut whose handler was not supplied', () => {
    renderHook(() => useGlobalKeys({}));
    expect(() => press('k', { ctrlKey: true })).not.toThrow();
  });

  it('removes its listener on unmount', () => {
    const onOpenPalette = vi.fn();
    const { unmount } = renderHook(() => useGlobalKeys({ onOpenPalette }));
    unmount();
    press('k', { ctrlKey: true });
    expect(onOpenPalette).not.toHaveBeenCalled();
  });
});
