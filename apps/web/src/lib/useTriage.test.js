import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTriage } from './useTriage.js';

const rows = [{ id: 'a', status: null }, { id: 'b', status: 'saved' }];

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useTriage setStatus', () => {
  it('applies a new status as-is', () => {
    const onStatus = vi.fn();
    const { result } = renderHook(() => useTriage(rows, onStatus));
    act(() => result.current.setStatus('a', 'saved'));
    expect(onStatus).toHaveBeenCalledWith('a', 'saved');
  });

  it('toggles the same status back off', () => {
    const onStatus = vi.fn();
    const { result } = renderHook(() => useTriage(rows, onStatus));
    act(() => result.current.setStatus('b', 'saved'));
    expect(onStatus).toHaveBeenCalledWith('b', null);
  });
});

describe('useTriage dismiss flash', () => {
  it('flags the row for the inline undo affordance', () => {
    const { result } = renderHook(() => useTriage(rows, vi.fn()));
    act(() => result.current.setStatus('a', 'dismissed'));
    expect(result.current.flashId).toBe('a');
  });

  it('clears itself after the flash window', () => {
    const { result } = renderHook(() => useTriage(rows, vi.fn()));
    act(() => result.current.setStatus('a', 'dismissed'));
    act(() => vi.advanceTimersByTime(6000));
    expect(result.current.flashId).toBe(null);
  });

  it('never flashes for a save or an apply', () => {
    const { result } = renderHook(() => useTriage(rows, vi.fn()));
    act(() => result.current.setStatus('a', 'saved'));
    expect(result.current.flashId).toBe(null);
  });
});

describe('useTriage undo', () => {
  it('reverts the last change to what it replaced', () => {
    const onStatus = vi.fn();
    const { result } = renderHook(() => useTriage(rows, onStatus));
    act(() => result.current.setStatus('a', 'dismissed'));
    onStatus.mockClear();
    act(() => result.current.undo());
    expect(onStatus).toHaveBeenCalledWith('a', null);
  });

  it('clears a pending dismiss flash along with the undo', () => {
    const { result } = renderHook(() => useTriage(rows, vi.fn()));
    act(() => result.current.setStatus('a', 'dismissed'));
    act(() => result.current.undo());
    expect(result.current.flashId).toBe(null);
  });

  it('is a no-op with nothing to undo', () => {
    const onStatus = vi.fn();
    const { result } = renderHook(() => useTriage(rows, onStatus));
    expect(result.current.canUndo).toBe(false);
    act(() => result.current.undo());
    expect(onStatus).not.toHaveBeenCalled();
  });

  it('can only be used once per change', () => {
    const onStatus = vi.fn();
    const { result } = renderHook(() => useTriage(rows, onStatus));
    act(() => result.current.setStatus('a', 'saved'));
    act(() => result.current.undo());
    onStatus.mockClear();
    act(() => result.current.undo());
    expect(onStatus).not.toHaveBeenCalled();
  });
});
