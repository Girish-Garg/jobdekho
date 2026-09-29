import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatLayout } from './useChatLayout.js';
import { readLayout } from './chatLayout.js';

function windowOf({ wide, width }) {
  window.matchMedia = vi.fn(() => ({ matches: wide, addEventListener() {}, removeEventListener() {} }));
  window.innerWidth = width;
}

beforeEach(() => localStorage.clear());
afterEach(() => {
  delete window.matchMedia;
  window.innerWidth = 1024;
});

describe('useChatLayout', () => {
  it('floats at the default width on a wide window, with the limits of that window', () => {
    windowOf({ wide: true, width: 1440 });
    const { result } = renderHook(() => useChatLayout());
    expect(result.current).toMatchObject({ wide: true, pinned: false, width: 380, min: 320, max: 720 });
  });

  it('pins and unpins, and remembers it', () => {
    windowOf({ wide: true, width: 1440 });
    const { result } = renderHook(() => useChatLayout());
    act(() => result.current.togglePinned());
    expect(result.current.pinned).toBe(true);
    expect(readLayout().pinned).toBe(true);
    act(() => result.current.togglePinned());
    expect(result.current.pinned).toBe(false);
  });

  it('resizes within the limits and remembers the width', () => {
    windowOf({ wide: true, width: 1440 });
    const { result } = renderHook(() => useChatLayout());
    act(() => result.current.setWidth(512));
    expect(result.current.width).toBe(512);
    expect(readLayout().width).toBe(512);
    act(() => result.current.setWidth(9000));
    expect(result.current.width).toBe(720);
  });

  it('shows a saved width clamped to a smaller window, and gives it back when the window grows', () => {
    localStorage.setItem('jobdekho-chat-layout', JSON.stringify({ width: 700 }));
    windowOf({ wide: true, width: 1100 });
    const { result } = renderHook(() => useChatLayout());
    expect(result.current.width).toBe(660);
    act(() => {
      window.innerWidth = 1600;
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current.width).toBe(700);
  });

  it('is never pinned on a narrow window, whatever was saved', () => {
    localStorage.setItem('jobdekho-chat-layout', JSON.stringify({ pinned: true }));
    windowOf({ wide: false, width: 900 });
    const { result } = renderHook(() => useChatLayout());
    expect(result.current.wide).toBe(false);
    expect(result.current.pinned).toBe(false);
  });

  // The Resume page docks the panel beside the documents whatever was saved,
  // and leaves the saved choice alone for every other page.
  it('pins a docked panel without changing the saved choice', () => {
    windowOf({ wide: true, width: 1440 });
    const { result } = renderHook(() => useChatLayout({ docked: true }));
    expect(result.current).toMatchObject({ pinned: true, docked: true });
    expect(readLayout().pinned).toBe(false);
  });

  it('does not dock on a narrow window, where the panel covers the page anyway', () => {
    windowOf({ wide: false, width: 900 });
    const { result } = renderHook(() => useChatLayout({ docked: true }));
    expect(result.current).toMatchObject({ pinned: false, docked: false });
  });
});
