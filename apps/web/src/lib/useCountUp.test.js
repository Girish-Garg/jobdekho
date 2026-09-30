import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountUp } from './useCountUp.js';

const view = (reduce) => ({ matchMedia: () => ({ matches: reduce }) });

afterEach(() => vi.useRealTimers());

describe('useCountUp', () => {
  it('shows the value at once where motion is reduced', () => {
    const { result } = renderHook(() => useCountUp(76, { view: view(true) }));
    expect(result.current).toBe(76);
  });

  it('shows the value at once where there is no way to ask', () => {
    const { result } = renderHook(() => useCountUp(76, { view: null }));
    expect(result.current).toBe(76);
  });

  it('counts up from zero and lands on the value', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const { result } = renderHook(() => useCountUp(80, { view: view(false), duration: 300 }));
    expect(result.current).toBe(0);
    await act(async () => { vi.advanceTimersByTime(150); });
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(80);
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(result.current).toBe(80);
  });

  it('passes a missing score through untouched', () => {
    const { result } = renderHook(() => useCountUp(undefined, { view: view(false) }));
    expect(result.current).toBeUndefined();
  });
});
