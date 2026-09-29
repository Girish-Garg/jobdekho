import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatDock } from './useChatDock.js';
import { readLayout, saveLayout } from './chatLayout.js';
import { askAboutPosting } from './askAiSignal.js';
import { startChatDraft } from './chatDraftSignal.js';

function wideWindow(wide) {
  window.matchMedia = vi.fn(() => ({ matches: wide, addEventListener() {}, removeEventListener() {} }));
}

beforeEach(() => localStorage.clear());
afterEach(() => { delete window.matchMedia; });

describe('useChatDock', () => {
  it('starts closed, and opens and closes on toggle', () => {
    const { result } = renderHook(() => useChatDock());
    expect(result.current.open).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.open).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.open).toBe(false);
  });

  it('opens on the job pane\'s ask, and drops that ask on close', () => {
    const { result } = renderHook(() => useChatDock());
    act(() => askAboutPosting({ id: 'p1', title: 'Engineer' }, null));
    expect(result.current.open).toBe(true);
    expect(result.current.request.posting.id).toBe('p1');
    act(() => result.current.close());
    expect(result.current.request).toBeNull();
  });

  it('comes back open after a reload when it was pinned and left open', () => {
    wideWindow(true);
    saveLayout({ pinned: true });
    const first = renderHook(() => useChatDock());
    act(() => first.result.current.toggle());
    expect(readLayout().open).toBe(true);
    first.unmount();
    expect(renderHook(() => useChatDock()).result.current.open).toBe(true);
  });

  it('starts closed after a reload when it was floating, even if it was open', () => {
    wideWindow(true);
    saveLayout({ pinned: false, open: true });
    expect(renderHook(() => useChatDock()).result.current.open).toBe(false);
  });

  it('opens with the words to start the box with, and drops them on close', () => {
    const { result } = renderHook(() => useChatDock());
    act(() => startChatDraft('Add a project: '));
    expect(result.current.open).toBe(true);
    expect(result.current.draft.text).toBe('Add a project: ');
    act(() => result.current.close());
    expect(result.current.draft).toBeNull();
  });

  it('opens on show without a request or a draft', () => {
    const { result } = renderHook(() => useChatDock());
    act(() => result.current.show());
    expect(result.current.open).toBe(true);
    expect(result.current.request).toBeNull();
  });
});
