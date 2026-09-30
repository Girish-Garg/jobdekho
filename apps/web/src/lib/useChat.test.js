import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChat } from './useChat.js';
import { useAiRunner } from './useAiRunner.js';
import { chatSession } from './chatSession.js';
import { onNotice } from './toast.js';

vi.mock('../api.js', () => ({
  getChatPending: vi.fn(async () => ({ pending: null, failed: null })),
  getChatHistory: vi.fn(async () => ({ turns: [] })),
  sendChatMessage: vi.fn(),
  startNewConversation: vi.fn(),
}));

import { getChatHistory, sendChatMessage, startNewConversation } from '../api.js';

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
  startNewConversation.mockResolvedValue({ id: 'c2', turns: [], filed: { id: 'c1', title: 'q', turnCount: 1 } });
});

describe('useChat', () => {
  it('loads the saved conversation on mount, with its id', async () => {
    getChatHistory.mockResolvedValue({ id: 'c1', turns: [TURN] });
    const { result } = renderHook(useWired);
    await waitFor(() => expect(result.current.chat.turns).toEqual([TURN]));
    expect(chatSession.get().conversationId).toBe('c1');
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

  it('starting a new conversation files the old one on the server and clears the screen and the last failure', async () => {
    getChatHistory.mockResolvedValue({ id: 'c1', turns: [TURN] });
    sendChatMessage.mockRejectedValueOnce(new Error('nope'));
    const { result } = renderHook(useWired);
    await waitFor(() => expect(result.current.chat.turns).toEqual([TURN]));
    await act(async () => { await result.current.chat.ask('hi', {}); });
    await act(async () => { await result.current.chat.startNew(); });
    expect(startNewConversation).toHaveBeenCalled();
    expect(result.current.chat.turns).toEqual([]);
    expect(chatSession.get().conversationId).toBe('c2');
    expect(result.current.runner.error).toBeNull();
  });

  it('keeps the conversation on screen when it could not be filed, and says so', async () => {
    getChatHistory.mockResolvedValue({ id: 'c1', turns: [TURN] });
    startNewConversation.mockRejectedValueOnce(new Error('The server is not running.'));
    const notices = [];
    const stop = onNotice((n) => notices.push(n));
    const { result } = renderHook(useWired);
    await waitFor(() => expect(result.current.chat.turns).toEqual([TURN]));
    await act(async () => { await result.current.chat.startNew(); });
    stop();
    expect(result.current.chat.turns).toEqual([TURN]);
    expect(notices[0]).toMatchObject({ kind: 'error', title: 'Could not start a new conversation' });
  });

  // The server saved the answer with the conversation it was asked in.
  it('leaves an answer that lands after a new conversation began where it was saved, and says where', async () => {
    getChatHistory.mockResolvedValue({ id: 'c1', turns: [] });
    let finish;
    sendChatMessage.mockImplementationOnce(() => new Promise((r) => { finish = r; }));
    const notices = [];
    const stop = onNotice((n) => notices.push(n));
    const { result } = renderHook(useWired);
    await waitFor(() => expect(chatSession.get().conversationId).toBe('c1'));
    let asking;
    act(() => { asking = result.current.chat.ask('hi', {}); });
    await act(async () => { await result.current.chat.startNew(); });
    await act(async () => { finish({ ...TURN, conversationId: 'c1' }); await asking; });
    stop();
    expect(result.current.chat.turns).toEqual([]);
    expect(notices.at(-1)).toMatchObject({ kind: 'done', title: 'The answer went to your earlier conversation' });
  });

  it('takes the conversation id from the first answer when the session did not know it yet', async () => {
    const { result } = renderHook(useWired);
    await waitFor(() => expect(getChatHistory).toHaveBeenCalled());
    sendChatMessage.mockResolvedValueOnce({ ...TURN, conversationId: 'c9' });
    await act(async () => { await result.current.chat.ask('hi', {}); });
    expect(result.current.chat.turns).toHaveLength(1);
    expect(chatSession.get().conversationId).toBe('c9');
  });

  it('puts a conversation continued from History on screen', async () => {
    const { result } = renderHook(useWired);
    act(() => result.current.chat.switchTo({ id: 'c5', turns: [TURN] }));
    expect(result.current.chat.turns).toEqual([TURN]);
    expect(chatSession.get().conversationId).toBe('c5');
  });
});
