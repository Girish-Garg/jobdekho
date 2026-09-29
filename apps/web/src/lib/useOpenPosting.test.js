import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOpenPosting } from './useOpenPosting.js';
import { currentOpenPosting, requestOpenPosting } from './openPostingSignal.js';
import { onNotice } from './toast.js';

const rows = [{ id: 'a' }, { id: 'b' }];

describe('useOpenPosting', () => {
  it('starts with nothing open', () => {
    const { result } = renderHook(() => useOpenPosting(rows));
    expect(result.current.opened).toBe(null);
  });

  it('opens the clicked posting', () => {
    const { result } = renderHook(() => useOpenPosting(rows));
    act(() => result.current.openFromClick(rows[0], document.createElement('div')));
    expect(result.current.opened).toBe(rows[0]);
  });

  it('returns focus to the element that opened it, on close', () => {
    const { result } = renderHook(() => useOpenPosting(rows));
    const element = document.createElement('button');
    document.body.appendChild(element);
    act(() => result.current.openFromClick(rows[0], element));
    act(() => result.current.close());
    expect(result.current.opened).toBe(null);
    expect(document.activeElement).toBe(element);
    document.body.removeChild(element);
  });

  it('opens by id, finding the row in the DOM by data-row-id for focus return', () => {
    const el = document.createElement('div');
    el.setAttribute('data-row-id', 'b');
    el.tabIndex = -1;
    document.body.appendChild(el);
    const { result } = renderHook(() => useOpenPosting(rows));
    act(() => result.current.openById('b'));
    expect(result.current.opened).toBe(rows[1]);
    act(() => result.current.close());
    expect(document.activeElement).toBe(el);
    document.body.removeChild(el);
  });

  it('ignores an id that is not among the current rows', () => {
    const { result } = renderHook(() => useOpenPosting(rows));
    act(() => result.current.openById('missing'));
    expect(result.current.opened).toBe(null);
  });

  it('announces the open posting for the chat panel, and clears it on unmount', () => {
    const { result, unmount } = renderHook(() => useOpenPosting(rows));
    expect(currentOpenPosting()).toBeNull();
    act(() => result.current.openFromClick(rows[0], document.createElement('div')));
    expect(currentOpenPosting()).toBe(rows[0]);
    unmount();
    expect(currentOpenPosting()).toBeNull();
  });

  // A ref chip in the chat asks for a posting by id; the feed opens it.
  it('opens a posting the chat asks for by id', () => {
    const { result } = renderHook(() => useOpenPosting(rows));
    act(() => requestOpenPosting('b'));
    expect(result.current.opened).toBe(rows[1]);
    expect(currentOpenPosting()).toBe(rows[1]);
  });

  it('says so out loud when the chat asks for a posting the feed no longer has', () => {
    const notices = [];
    const stop = onNotice((n) => notices.push(n));
    const { result } = renderHook(() => useOpenPosting(rows));
    act(() => requestOpenPosting('gone'));
    expect(result.current.opened).toBe(null);
    expect(notices).toHaveLength(1);
    expect(notices[0].title).toBe('Not in the feed right now');
    stop();
  });
});
