import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useScrape } from './useScrape.js';
import { onRefreshed } from './postingsRefreshedSignal.js';
import { onNotice } from './toast.js';

vi.mock('../api.js', () => ({ getScrapeState: vi.fn(), startScrape: vi.fn() }));

import { getScrapeState, startScrape } from '../api.js';

const RESULT = { fresh: 37, total: 900, tooOld: 0, removed: 2, failed: [] };
const IDLE = { running: false, startedAt: null, finishedAt: null, done: 0, total: 0, lastRun: null };
const running = (done) => ({ ...IDLE, running: true, startedAt: '2026-09-30T10:00:00.000Z', done, total: 118 });
const finished = { ...IDLE, finishedAt: '2026-09-30T10:02:00.000Z', done: 118, total: 118, result: RESULT, lastRun: { at: '2026-09-30T10:02:00.000Z', fresh: 37, sources: 118, failed: [] } };

// Fast while running, never again while idle within a test's lifetime.
const FAST = { runningMs: 5, idleMs: 60 * 60 * 1000 };

let refreshed;
let stopListening;
beforeEach(() => {
  vi.clearAllMocks();
  refreshed = vi.fn();
  stopListening = onRefreshed(refreshed);
  getScrapeState.mockResolvedValue(IDLE);
});
afterEach(() => stopListening());

describe('useScrape', () => {
  it('reads the state once and stays quiet while nothing runs', async () => {
    const { result } = renderHook(() => useScrape(FAST));
    await waitFor(() => expect(result.current.scrape).toEqual(IDLE));
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(getScrapeState).toHaveBeenCalledTimes(1);
    expect(result.current.finished).toBe(false);
    expect(refreshed).not.toHaveBeenCalled();
  });

  it('follows a refresh already running when the page loads, and tells the feed when it ends', async () => {
    getScrapeState.mockResolvedValueOnce(running(10)).mockResolvedValueOnce(running(42)).mockResolvedValue(finished);
    const seen = [];
    const { result } = renderHook(() => {
      const out = useScrape(FAST);
      seen.push(out.scrape?.running ? out.scrape.done : null);
      return out;
    });
    await waitFor(() => expect(result.current.finished).toBe(true));
    expect(seen).toContain(10);
    expect(seen).toContain(42);
    expect(result.current.scrape.result).toEqual(RESULT);
    expect(refreshed).toHaveBeenCalledTimes(1);
    expect(refreshed).toHaveBeenCalledWith(RESULT);
  });

  it('starts a refresh, follows it to the end, and tells the feed once', async () => {
    const { result } = renderHook(() => useScrape(FAST));
    await waitFor(() => expect(result.current.scrape).toEqual(IDLE));
    startScrape.mockResolvedValue(running(0));
    getScrapeState.mockResolvedValueOnce(running(60)).mockResolvedValue(finished);
    await act(() => result.current.start());
    expect(startScrape).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.finished).toBe(true));
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(refreshed).toHaveBeenCalledTimes(1);
  });

  it('follows the run already going when the start is refused with a 409, without a notice', async () => {
    const notices = vi.fn();
    const stop = onNotice(notices);
    const { result } = renderHook(() => useScrape(FAST));
    await waitFor(() => expect(result.current.scrape).toEqual(IDLE));
    startScrape.mockRejectedValue(Object.assign(new Error('Postings are already being refreshed.'), { status: 409 }));
    getScrapeState.mockResolvedValueOnce(running(80)).mockResolvedValue(finished);
    await act(() => result.current.start());
    await waitFor(() => expect(result.current.finished).toBe(true));
    stop();
    expect(notices).not.toHaveBeenCalled();
    expect(refreshed).toHaveBeenCalledTimes(1);
  });

  it('says so when the start itself fails', async () => {
    const notices = vi.fn();
    const stop = onNotice(notices);
    const { result } = renderHook(() => useScrape(FAST));
    await waitFor(() => expect(result.current.scrape).toEqual(IDLE));
    startScrape.mockRejectedValue(Object.assign(new Error('internal server error'), { status: 500 }));
    await act(() => result.current.start());
    stop();
    expect(notices).toHaveBeenCalledWith(expect.objectContaining({ title: 'Could not refresh postings', detail: 'internal server error' }));
  });

  it('ends a watched run that failed with the error, and still tells the feed', async () => {
    const failed = { ...IDLE, finishedAt: '2026-09-30T10:02:00.000Z', error: 'The refresh could not finish.' };
    getScrapeState.mockResolvedValueOnce(running(5)).mockResolvedValue(failed);
    const { result } = renderHook(() => useScrape(FAST));
    await waitFor(() => expect(result.current.finished).toBe(true));
    expect(result.current.scrape.error).toBe('The refresh could not finish.');
    expect(refreshed).toHaveBeenCalledWith(null);
  });

  it('keeps asking through a server briefly out of reach mid-run', async () => {
    getScrapeState.mockResolvedValueOnce(running(5)).mockRejectedValueOnce(new Error('down')).mockResolvedValue(finished);
    const { result } = renderHook(() => useScrape(FAST));
    await waitFor(() => expect(result.current.finished).toBe(true));
    expect(getScrapeState).toHaveBeenCalledTimes(3);
  });

  it('stops asking once the page is gone', async () => {
    getScrapeState.mockResolvedValue(running(5));
    const { unmount } = renderHook(() => useScrape(FAST));
    await waitFor(() => expect(getScrapeState.mock.calls.length).toBeGreaterThanOrEqual(2));
    unmount();
    const calls = getScrapeState.mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(getScrapeState).toHaveBeenCalledTimes(calls);
  });
});
