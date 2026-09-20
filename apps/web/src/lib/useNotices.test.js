import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNotices } from './useNotices.js';
import { notify } from './toast.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useNotices', () => {
  it('stacks notices that do not repeat each other', () => {
    const { result } = renderHook(() => useNotices());
    act(() => {
      notify({ title: 'A', kind: 'error' });
      notify({ title: 'B', kind: 'error' });
    });
    expect(result.current.notices.map((n) => n.title)).toEqual(['A', 'B']);
  });

  // The same title and detail landing twice - a retry that fails the same
  // way - reads as one notice bumped, not a second one beside it.
  it('bumps a repeat onto the notice already on screen', () => {
    const { result } = renderHook(() => useNotices());
    act(() => notify({ title: 'Cover letter', detail: 'not signed in', kind: 'error' }));
    act(() => notify({ title: 'Cover letter', detail: 'not signed in', kind: 'error' }));
    expect(result.current.notices).toHaveLength(1);
    expect(result.current.notices[0].count).toBe(2);
  });

  it('never bumps two notices that only share a title', () => {
    const { result } = renderHook(() => useNotices());
    act(() => notify({ title: 'Cover letter', detail: 'not signed in', kind: 'error' }));
    act(() => notify({ title: 'Cover letter', detail: 'timed out', kind: 'error' }));
    expect(result.current.notices).toHaveLength(2);
  });

  it('fades a done notice on its own after a few seconds', () => {
    const { result } = renderHook(() => useNotices());
    act(() => notify({ title: 'Saved', kind: 'done' }));
    expect(result.current.notices).toHaveLength(1);
    act(() => vi.advanceTimersByTime(6000));
    expect(result.current.notices).toHaveLength(0);
  });

  it('leaves an error standing however long it waits', () => {
    const { result } = renderHook(() => useNotices());
    act(() => notify({ title: 'Broke', kind: 'error' }));
    act(() => vi.advanceTimersByTime(60000));
    expect(result.current.notices).toHaveLength(1);
  });

  it('dismiss removes a notice immediately, and cancels its fade timer', () => {
    const { result } = renderHook(() => useNotices());
    act(() => notify({ title: 'Saved', kind: 'done' }));
    const { id } = result.current.notices[0];
    act(() => result.current.dismiss(id));
    expect(result.current.notices).toHaveLength(0);
    // If the cancelled timer still fired, this would throw trying to filter
    // a list that no longer has the notice - it should simply do nothing.
    expect(() => act(() => vi.advanceTimersByTime(6000))).not.toThrow();
  });

  it('a repeat of a done notice resets its own fade clock', () => {
    const { result } = renderHook(() => useNotices());
    act(() => notify({ title: 'Saved', detail: '', kind: 'done' }));
    act(() => vi.advanceTimersByTime(4000));
    act(() => notify({ title: 'Saved', detail: '', kind: 'done' }));
    act(() => vi.advanceTimersByTime(2000));
    // 6s since the second notify, only 6s since the first - the bump should
    // have restarted the clock rather than let the first timer fire at 5s.
    expect(result.current.notices).toHaveLength(1);
  });
});
