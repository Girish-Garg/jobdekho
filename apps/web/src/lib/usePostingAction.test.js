import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePostingAction, versionsOf } from './usePostingAction.js';

vi.mock('../api.js', () => ({
  getPostingAiResults: vi.fn(async () => []),
  runPostingAction: vi.fn(async () => FRESH),
}));

import { getPostingAiResults, runPostingAction } from '../api.js';

const PROVIDERS = [{ id: 'claude', label: 'Claude Code', present: true, runs: true }];
const SAVED = { kind: 'fake-check', postingId: 'p1', provider: 'claude', createdAt: 'x', result: { verdict: 'unclear' } };
const OTHER = { ...SAVED, kind: 'cover-letter', result: { text: 'Dear' } };
const FRESH = { ...SAVED, createdAt: 'y', result: { verdict: 'genuine' } };
const ARGS = { postingId: 'p1', kind: 'fake-check', providers: PROVIDERS, noun: 'Posting', doing: 'checking the web' };

beforeEach(() => {
  vi.clearAllMocks();
  getPostingAiResults.mockResolvedValue([]);
  runPostingAction.mockResolvedValue(FRESH);
});

describe('usePostingAction', () => {
  it('starts undefined while asking, then null when nothing was saved for this kind', async () => {
    getPostingAiResults.mockResolvedValue([OTHER]);
    const { result } = renderHook(() => usePostingAction(ARGS));
    expect(result.current.saved).toBeUndefined();
    await waitFor(() => expect(result.current.saved).toBeNull());
    expect(getPostingAiResults).toHaveBeenCalledWith('p1');
  });

  it('picks the saved record of its own kind out of the posting\'s list', async () => {
    getPostingAiResults.mockResolvedValue([OTHER, SAVED]);
    const { result } = renderHook(() => usePostingAction(ARGS));
    await waitFor(() => expect(result.current.saved).toEqual(SAVED));
  });

  it('reads a failed lookup as nothing saved, so the button is still offered', async () => {
    getPostingAiResults.mockRejectedValue(new Error('GET -> 500'));
    const { result } = renderHook(() => usePostingAction(ARGS));
    await waitFor(() => expect(result.current.saved).toBeNull());
    expect(result.current.error).toBeNull();
  });

  it('runs the action, narrates it with the caller\'s words and keeps the new record', async () => {
    let finish;
    runPostingAction.mockImplementationOnce(async (_id, _kind, { onEvent }) => {
      onEvent({ event: 'start', provider: 'claude', path: 'C:\\npm\\claude.cmd' });
      onEvent({ event: 'progress', stage: 'send', chars: 1200 });
      onEvent({ event: 'progress', stage: 'wait', elapsedMs: 65000 });
      await new Promise((r) => { finish = r; });
      return FRESH;
    });
    const { result } = renderHook(() => usePostingAction(ARGS));
    await waitFor(() => expect(result.current.saved).toBeNull());
    act(() => { result.current.run(); });
    await waitFor(() => expect(result.current.progress).toBe('Claude Code is checking the web... 65s'));
    expect(result.current.busy).toBe(true);
    expect(runPostingAction).toHaveBeenCalledWith('p1', 'fake-check', { onEvent: expect.any(Function) });
    await act(async () => { finish(); });
    await waitFor(() => expect(result.current.busy).toBe(false));
    expect(result.current.saved).toEqual(FRESH);
  });

  it('keeps the failure with its kind, leaves the old record in place, and clears on request', async () => {
    getPostingAiResults.mockResolvedValue([SAVED]);
    runPostingAction.mockRejectedValueOnce(Object.assign(new Error('Claude Code is not installed'), { kind: 'not_found' }));
    const { result } = renderHook(() => usePostingAction(ARGS));
    await waitFor(() => expect(result.current.saved).toEqual(SAVED));
    await act(async () => { await result.current.run(); });
    expect(result.current.error).toMatchObject({ message: 'Claude Code is not installed', kind: 'not_found' });
    expect(result.current.saved).toEqual(SAVED);
    expect(result.current.busy).toBe(false);
    act(() => { result.current.clearError(); });
    expect(result.current.error).toBeNull();
  });

  it('asks again when the posting changes', async () => {
    const { result, rerender } = renderHook((props) => usePostingAction(props), { initialProps: ARGS });
    await waitFor(() => expect(result.current.saved).toBeNull());
    rerender({ ...ARGS, postingId: 'p2' });
    await waitFor(() => expect(getPostingAiResults).toHaveBeenLastCalledWith('p2'));
  });

  it('refines with the instruction in the request and keeps the fresh record', async () => {
    getPostingAiResults.mockResolvedValue([SAVED]);
    const { result } = renderHook(() => usePostingAction(ARGS));
    await waitFor(() => expect(result.current.saved).toEqual(SAVED));
    await act(async () => { await result.current.refine('check the recruiter email'); });
    expect(runPostingAction).toHaveBeenCalledWith('p1', 'fake-check', { onEvent: expect.any(Function), instruction: 'check the recruiter email' });
    expect(result.current.saved).toEqual(FRESH);
  });

  it('runs a plain rerun as a bodyless call, with no instruction key at all', async () => {
    getPostingAiResults.mockResolvedValue([SAVED]);
    const { result } = renderHook(() => usePostingAction(ARGS));
    await waitFor(() => expect(result.current.saved).toEqual(SAVED));
    await act(async () => { await result.current.run(); });
    expect(runPostingAction).toHaveBeenCalledWith('p1', 'fake-check', { onEvent: expect.any(Function) });
  });
});

describe('versionsOf', () => {
  it('is empty for nothing saved', () => {
    expect(versionsOf(null)).toEqual([]);
  });

  it('passes a record\'s own versions through unchanged', () => {
    const versions = [{ instruction: '', provider: 'claude', createdAt: 'a', result: { verdict: 'unclear' } }];
    expect(versionsOf({ ...SAVED, versions })).toBe(versions);
  });

  it('reads a record with no versions as its one answer, instruction empty', () => {
    expect(versionsOf(SAVED)).toEqual([{ instruction: '', provider: 'claude', createdAt: 'x', result: { verdict: 'unclear' } }]);
  });
});
