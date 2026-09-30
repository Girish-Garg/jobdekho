import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChat } from './useChat.js';
import { useAiRunner } from './useAiRunner.js';
import { onNotice } from './toast.js';

vi.mock('../api.js', () => ({
  getChatPending: vi.fn(async () => ({ pending: null, failed: null })),
  getChatHistory: vi.fn(async () => ({ turns: [] })),
  sendChatMessage: vi.fn(),
  clearChatHistory: vi.fn(async () => null),
}));

import { getChatHistory, sendChatMessage, clearChatHistory } from '../api.js';

const PROVIDERS = [{ id: 'claude', label: 'Claude Code' }];
const TURN = { question: 'q', answer: 'a', actions: [], refs: [], provider: 'claude', createdAt: 'x' };

// The chat as the panel wires it: its questions go through the same runner
// the posting actions use, so the wait and the failure are the runner's.
function useWired() {
  const runner = useAiRunner(PROVIDERS);
  return { runner, chat: useChat(runner) };
}

beforeEach(() => {
  vi.clearAllMocks();
  getChatHistory.mockResolvedValue({ turns: [] });
  sendChatMessage.mockResolvedValue(TURN);
});

describe('useChat', () => {
  it('loads the saved conversation on mount', async () => {
    getChatHistory.mockResolvedValue({ turns: [TURN] });
    const { result } = renderHook(useWired);
    await waitFor(() => expect(result.current.chat.turns).toEqual([TURN]));
  });

  it('sends a turn, carrying the screen pointers, and appends what came back', async () => {
    const { result } = renderHook(useWired);
    await act(async () => {
      await result.current.chat.ask('which are remote?', { filters: { levels: ['mid'] }, sort: 'match', openPostingId: 'p1' });
    });
    expect(sendChatMessage).toHaveBeenCalledWith(
      { message: 'which are remote?', filters: { levels: ['mid'] }, sort: 'match', openPostingId: 'p1' },
      { onEvent: expect.any(Function) },
    );
    expect(result.current.chat.turns).toEqual([TURN]);
  });

  it('narrates the wait through the runner, with the question as the pending line', async () => {
    let finish;
    sendChatMessage.mockImplementationOnce(async (_body, { onEvent }) => {
      onEvent({ event: 'start', provider: 'claude', path: 'x' });
      onEvent({ event: 'progress', stage: 'wait', elapsedMs: 12000 });
      await new Promise((r) => { finish = r; });
      return TURN;
    });
    const { result } = renderHook(useWired);
    act(() => { result.current.chat.ask('hi', {}); });
    await waitFor(() => expect(result.current.runner.progress).toBe('Claude Code is thinking... 12s'));
    expect(result.current.runner.pending).toMatchObject({ say: 'hi' });
    await act(async () => finish());
    await waitFor(() => expect(result.current.runner.busy).toBe(false));
  });

  it('keeps the failure for AiError and also raises it on the toast channel', async () => {
    sendChatMessage.mockRejectedValueOnce(Object.assign(new Error('Claude Code is not installed'), { kind: 'not_found' }));
    const notices = [];
    const stop = onNotice((n) => notices.push(n));
    const { result } = renderHook(useWired);
    await act(async () => { await result.current.chat.ask('hi', {}); });
    expect(result.current.runner.error).toMatchObject({ message: 'Claude Code is not installed', kind: 'not_found' });
    expect(result.current.chat.turns).toEqual([]);
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({ kind: 'error', detail: 'Claude Code is not installed' });
    stop();
  });

  it('starting a new conversation clears the server copy, the local one and the last failure', async () => {
    getChatHistory.mockResolvedValue({ turns: [TURN] });
    sendChatMessage.mockRejectedValueOnce(new Error('nope'));
    const { result } = renderHook(useWired);
    await waitFor(() => expect(result.current.chat.turns).toEqual([TURN]));
    await act(async () => { await result.current.chat.ask('hi', {}); });
    await act(async () => { await result.current.chat.startNew(); });
    expect(clearChatHistory).toHaveBeenCalled();
    expect(result.current.chat.turns).toEqual([]);
    expect(result.current.runner.error).toBeNull();
  });
});
