import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChat } from './useChat.js';
import { onNotice } from './toast.js';

vi.mock('../api.js', () => ({
  getChatHistory: vi.fn(async () => ({ turns: [] })),
  sendChatMessage: vi.fn(),
  clearChatHistory: vi.fn(async () => null),
}));

import { getChatHistory, sendChatMessage, clearChatHistory } from '../api.js';

const PROVIDERS = [{ id: 'claude', label: 'Claude Code' }];
const TURN = { question: 'q', answer: 'a', actions: [], provider: 'claude', createdAt: 'x' };

beforeEach(() => {
  vi.clearAllMocks();
  getChatHistory.mockResolvedValue({ turns: [] });
  sendChatMessage.mockResolvedValue(TURN);
});

describe('useChat', () => {
  it('loads the saved conversation on mount', async () => {
    getChatHistory.mockResolvedValue({ turns: [TURN] });
    const { result } = renderHook(() => useChat(PROVIDERS));
    await waitFor(() => expect(result.current.turns).toEqual([TURN]));
  });

  it('sends a turn, carrying the screen pointers, and appends what came back', async () => {
    const { result } = renderHook(() => useChat(PROVIDERS));
    await waitFor(() => expect(result.current.turns).toEqual([]));
    await act(async () => {
      await result.current.send('which are remote?', { filters: { levels: ['mid'] }, sort: 'match', openPostingId: 'p1' });
    });
    expect(sendChatMessage).toHaveBeenCalledWith(
      { message: 'which are remote?', filters: { levels: ['mid'] }, sort: 'match', openPostingId: 'p1' },
      { onEvent: expect.any(Function) },
    );
    expect(result.current.turns).toEqual([TURN]);
  });

  it('narrates the wait while a call is in flight', async () => {
    let finish;
    sendChatMessage.mockImplementationOnce(async (_body, { onEvent }) => {
      onEvent({ event: 'start', provider: 'claude', path: 'x' });
      onEvent({ event: 'progress', stage: 'wait', elapsedMs: 12000 });
      await new Promise((r) => { finish = r; });
      return TURN;
    });
    const { result } = renderHook(() => useChat(PROVIDERS));
    act(() => { result.current.send('hi', {}); });
    await waitFor(() => expect(result.current.progress).toBe('Claude Code is thinking... 12s'));
    expect(result.current.busy).toBe(true);
    await act(async () => finish());
    await waitFor(() => expect(result.current.busy).toBe(false));
  });

  it('keeps the failure for AiError and also raises it on the toast channel', async () => {
    sendChatMessage.mockRejectedValueOnce(Object.assign(new Error('Claude Code is not installed'), { kind: 'not_found' }));
    const notices = [];
    const stop = onNotice((n) => notices.push(n));
    const { result } = renderHook(() => useChat(PROVIDERS));
    await act(async () => { await result.current.send('hi', {}); });
    expect(result.current.error).toMatchObject({ message: 'Claude Code is not installed', kind: 'not_found' });
    expect(result.current.turns).toEqual([]);
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({ kind: 'error', detail: 'Claude Code is not installed' });
    stop();
  });

  it('clears the error on request', async () => {
    sendChatMessage.mockRejectedValueOnce(new Error('nope'));
    const { result } = renderHook(() => useChat(PROVIDERS));
    await act(async () => { await result.current.send('hi', {}); });
    expect(result.current.error).not.toBeNull();
    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
  });

  it('starting a new conversation clears the server copy and the local one', async () => {
    getChatHistory.mockResolvedValue({ turns: [TURN] });
    const { result } = renderHook(() => useChat(PROVIDERS));
    await waitFor(() => expect(result.current.turns).toEqual([TURN]));
    await act(async () => { await result.current.startNew(); });
    expect(clearChatHistory).toHaveBeenCalled();
    expect(result.current.turns).toEqual([]);
  });
});
