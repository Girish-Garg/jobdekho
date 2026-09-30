import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePostingSelection } from './usePostingSelection.js';

const pane = (opened = null) => ({
  opened, openById: vi.fn(), openFromClick: vi.fn(), close: vi.fn(), dismiss: vi.fn(),
});
const triage = { setStatus: vi.fn(), undo: vi.fn() };
const rows = [{ id: 'a' }, { id: 'b' }];

describe('usePostingSelection', () => {
  it('selects what a click opens', () => {
    const p = pane();
    const { result } = renderHook(() => usePostingSelection(rows, p, triage));
    act(() => result.current.openFromClick(rows[1], null));
    expect(result.current.selectedId).toBe('b');
    expect(p.openFromClick).toHaveBeenCalledWith(rows[1], null);
  });

  // A highlight left on a closed job read as if it were still open.
  it('lets go of the card when the pane is put away by the pointer', () => {
    const p = pane(rows[0]);
    const { result } = renderHook(() => usePostingSelection(rows, p, triage));
    act(() => result.current.setSelectedId('a'));
    act(() => result.current.dismissPane());
    expect(p.dismiss).toHaveBeenCalled();
    expect(result.current.selectedId).toBeNull();
    act(() => result.current.setSelectedId('a'));
    act(() => result.current.closePane());
    expect(p.close).toHaveBeenCalled();
    expect(result.current.selectedId).toBeNull();
  });

  // Escape keeps the keyboard's place, so j and k carry on from it.
  it('keeps the selection when Escape closes the pane', () => {
    const p = pane(rows[0]);
    const { result } = renderHook(() => usePostingSelection(rows, p, triage));
    act(() => result.current.setSelectedId('a'));
    act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
    expect(p.close).toHaveBeenCalled();
    expect(result.current.selectedId).toBe('a');
  });
});
