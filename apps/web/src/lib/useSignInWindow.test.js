import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSignInWindow } from './useSignInWindow.js';
import * as api from '../api/apply.js';

vi.mock('../api/apply.js', () => ({
  openSignInWindow: vi.fn(async () => ({ open: true, url: 'https://internshala.com/job/1' })),
  signInWindowState: vi.fn(async () => ({ open: true })),
  closeSignInWindow: vi.fn(async () => ({ open: false })),
}));

const apply = () => ({ sessionId: () => 's1', replace: vi.fn(async () => {}) });

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('useSignInWindow', () => {
  it('opens the normal window for the open application and waits for it', async () => {
    const a = apply();
    const { result } = renderHook(() => useSignInWindow(a));
    await act(async () => { await result.current.start(); });
    expect(api.openSignInWindow).toHaveBeenCalledWith('s1');
    expect(result.current.waiting).toEqual({ url: 'https://internshala.com/job/1' });
  });

  // Closing the window is all it takes to carry on.
  it('opens Apply assist again once the window has closed', async () => {
    const a = apply();
    const { result } = renderHook(() => useSignInWindow(a));
    await act(async () => { await result.current.start(); });
    api.signInWindowState.mockResolvedValueOnce({ open: false });
    await act(async () => { await vi.advanceTimersByTimeAsync(1600); });
    expect(result.current.waiting).toBeNull();
    expect(api.closeSignInWindow).toHaveBeenCalled();
    expect(a.replace).toHaveBeenCalled();
  });

  it('carries on at once when the person presses Continue', async () => {
    const a = apply();
    const { result } = renderHook(() => useSignInWindow(a));
    await act(async () => { await result.current.start(); });
    await act(async () => { await result.current.resume(); });
    expect(api.closeSignInWindow).toHaveBeenCalled();
    expect(a.replace).toHaveBeenCalledTimes(1);
  });
});
