import { describe, it, expect, vi } from 'vitest';
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

  // The chat names jobs from the whole corpus, which the filters on screen
  // may hide; telling the person it was "not in the feed" was no answer.
  it('fetches and opens a posting the chat names that the feed does not hold', async () => {
    const elsewhere = { id: 'r1', title: 'Forward Deployed Engineer', status: null };
    const fetchPosting = vi.fn(async () => elsewhere);
    const { result } = renderHook(() => useOpenPosting(rows, { fetchPosting }));
    await act(async () => { requestOpenPosting('r1'); });
    expect(fetchPosting).toHaveBeenCalledWith('r1');
    expect(result.current.opened).toBe(elsewhere);
    expect(currentOpenPosting()).toBe(elsewhere);
    act(() => result.current.patchOutside('r1', 'saved'));
    expect(result.current.opened).toEqual({ ...elsewhere, status: 'saved' });
  });

  it('says so out loud when JobDekho no longer holds the posting at all', async () => {
    const notices = [];
    const stop = onNotice((n) => notices.push(n));
    const fetchPosting = vi.fn(async () => { throw Object.assign(new Error('no such posting'), { status: 404 }); });
    const { result } = renderHook(() => useOpenPosting(rows, { fetchPosting }));
    await act(async () => { requestOpenPosting('gone'); });
    expect(result.current.opened).toBe(null);
    expect(notices).toHaveLength(1);
    expect(notices[0].title).toBe('That job is gone');
    stop();
  });
});
