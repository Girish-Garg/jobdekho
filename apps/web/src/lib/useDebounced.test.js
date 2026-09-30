import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounced } from './useDebounced.js';

afterEach(() => vi.useRealTimers());

describe('useDebounced', () => {
  // Typing "frontend" used to ask the server for eight pages.
  it('follows its source only once the source holds still', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebounced(value, 300), { initialProps: { value: '' } });
    for (const typed of ['f', 'fr', 'fro', 'front']) {
      rerender({ value: typed });
      act(() => { vi.advanceTimersByTime(100); });
    }
    expect(result.current).toBe('');
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe('front');
  });
});
