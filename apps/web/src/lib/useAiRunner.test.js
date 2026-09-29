import { describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAiRunner } from './useAiRunner.js';

const PROVIDERS = [{ id: 'claude', label: 'Claude Code' }];
const WHAT = { say: 'Write a cover letter', noun: 'Posting', doing: 'writing' };

describe('useAiRunner', () => {
  it('narrates one call in its own words and resolves with the answer', async () => {
    let finish;
    const { result } = renderHook(() => useAiRunner(PROVIDERS));
    let answer;
    act(() => {
      result.current.run(WHAT, async (onEvent) => {
        onEvent({ event: 'start', provider: 'claude' });
        onEvent({ event: 'progress', stage: 'wait', elapsedMs: 9000 });
        await new Promise((r) => { finish = r; });
        return 'done';
      }).then((value) => { answer = value; });
    });
    await waitFor(() => expect(result.current.progress).toBe('Claude Code is writing... 9s'));
    expect(result.current.pending).toBe(WHAT);
    expect(result.current.busy).toBe(true);
    await act(async () => finish());
    await waitFor(() => expect(result.current.busy).toBe(false));
    expect(answer).toBe('done');
  });

  // One CLI, one subscription: two calls started together is the sign-in
  // refresh race the server reports as 'busy'.
  it('refuses a second call while one is in flight', async () => {
    let finish;
    let second = 'untouched';
    const { result } = renderHook(() => useAiRunner(PROVIDERS));
    act(() => { result.current.run(WHAT, () => new Promise((r) => { finish = r; })); });
    await act(async () => { second = await result.current.run(WHAT, async () => 'second'); });
    expect(second).toBeNull();
    await act(async () => finish('first'));
  });

  it('keeps a failure, verbatim with its kind, and resolves with null', async () => {
    const { result } = renderHook(() => useAiRunner(PROVIDERS));
    let answer;
    await act(async () => {
      answer = await result.current.run(WHAT, async () => { throw Object.assign(new Error('Claude Code is busy refreshing'), { kind: 'busy' }); });
    });
    expect(answer).toBeNull();
    expect(result.current.error).toMatchObject({ message: 'Claude Code is busy refreshing', kind: 'busy' });
    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
  });

  // The chat's second call is a search (see the server's chat/web-answer.js),
  // and its heartbeats should not go on saying the CLI is thinking.
  it('changes its words once a chat question goes to the web', async () => {
    let finish;
    const { result } = renderHook(() => useAiRunner(PROVIDERS));
    act(() => {
      result.current.run({ say: 'Is Acme funded?', noun: 'Question', doing: 'thinking' }, async (onEvent) => {
        onEvent({ event: 'start', provider: 'claude' });
        onEvent({ event: 'progress', stage: 'wait', elapsedMs: 3000 });
        onEvent({ event: 'progress', stage: 'web' });
        onEvent({ event: 'start', provider: 'claude' });
        onEvent({ event: 'progress', stage: 'send', chars: 40 });
        onEvent({ event: 'progress', stage: 'wait', elapsedMs: 12000 });
        await new Promise((r) => { finish = r; });
        return 'done';
      });
    });
    await waitFor(() => expect(result.current.progress).toBe('Claude Code is searching the web... 12s'));
    await act(async () => finish());
  });
});
