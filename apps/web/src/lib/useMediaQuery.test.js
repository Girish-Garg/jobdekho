import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from './useMediaQuery.js';

const view = (matches, media = {}) => ({ matchMedia: () => ({ matches, ...media }) });

describe('useMediaQuery', () => {
  it('reads the initial match synchronously, both ways', () => {
    expect(renderHook(() => useMediaQuery('(min-width: 1100px)', view(true))).result.current).toBe(true);
    expect(renderHook(() => useMediaQuery('(min-width: 1100px)', view(false))).result.current).toBe(false);
  });

  it('defaults to false where matchMedia does not exist, as in jsdom', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 1100px)', {}));
    expect(result.current).toBe(false);
  });

  it('subscribes on mount and unsubscribes on unmount', () => {
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    const { unmount } = renderHook(() =>
      useMediaQuery('(min-width: 1100px)', view(false, { addEventListener, removeEventListener })),
    );
    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    unmount();
    expect(removeEventListener).toHaveBeenCalled();
  });

  it('updates the value when the query flips', () => {
    let handler;
    const media = {
      matches: false,
      addEventListener: (_event, fn) => { handler = fn; },
      removeEventListener: () => {},
    };
    const { result } = renderHook(() => useMediaQuery('(min-width: 1100px)', { matchMedia: () => media }));
    expect(result.current).toBe(false);
    media.matches = true;
    act(() => handler());
    expect(result.current).toBe(true);
  });
});
