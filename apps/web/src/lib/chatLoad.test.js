import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { loadChat } from './chatLoad.js';
import { addTurn, chatSession } from './chatSession.js';

vi.mock('../api.js', () => ({ getChatPending: vi.fn(), getChatHistory: vi.fn() }));

import { getChatPending, getChatHistory } from '../api.js';

const TURN = { id: 't1', question: 'which are remote?', answer: 'Two.' };
const PENDING = { question: 'is Acme hiring?', startedAt: '2026-09-30T10:00:00.000Z', provider: 'agy', stage: 'wait', web: false };
const idle = { pending: null, failed: null };

beforeEach(() => {
  vi.clearAllMocks();
  getChatPending.mockResolvedValue(idle);
  getChatHistory.mockResolvedValue({ turns: [TURN] });
});

describe('loadChat', () => {
  it('reads the conversation once per page', async () => {
    await loadChat();
    await loadChat();
    expect(chatSession.get().turns).toEqual([TURN]);
    expect(getChatHistory).toHaveBeenCalledTimes(1);
  });

  // The server saves an answer before it stops calling the question
  // pending, so reading pending first can never miss an answer.
  it('reads what is in flight before the history', async () => {
    await loadChat();
    expect(getChatPending.mock.invocationCallOrder[0]).toBeLessThan(getChatHistory.mock.invocationCallOrder[0]);
  });

  it('shows a question asked before a reload as pending, from when it was asked, until its answer is saved', async () => {
    getChatPending.mockResolvedValueOnce({ pending: PENDING, failed: null }).mockResolvedValueOnce({ pending: { ...PENDING, web: true }, failed: null });
    getChatHistory.mockResolvedValueOnce({ turns: [] });
    const seen = [];
    const stop = chatSession.subscribe(() => seen.push(chatSession.get().call?.words.doing));
    await loadChat({ pollMs: 5 });
    const call = chatSession.get().call;
    expect(call).toMatchObject({ remote: true, provider: 'agy', what: { say: 'is Acme hiring?' } });
    expect(call.startedAt).toBe(Date.parse(PENDING.startedAt));
    await waitFor(() => expect(chatSession.get().call).toBeNull());
    stop();
    expect(seen).toContain('searching the web');
    expect(chatSession.get().turns).toEqual([TURN]);
    expect(chatSession.get().unseen).toBe(true);
  });

  it('says so when the question failed while nobody was watching', async () => {
    getChatPending.mockResolvedValueOnce({ pending: null, failed: { question: 'q', error: 'Antigravity is not signed in.' } });
    await loadChat();
    expect(chatSession.get().error.message).toBe('Antigravity is not signed in.');
  });

  it('keeps a question asked before the history arrived, once', async () => {
    let arrive;
    getChatHistory.mockImplementationOnce(() => new Promise((resolve) => { arrive = resolve; }));
    const loading = loadChat();
    await waitFor(() => expect(getChatHistory).toHaveBeenCalled());
    addTurn({ id: 't2', question: 'new', answer: 'yes' });
    addTurn(TURN);
    arrive({ turns: [TURN] });
    await loading;
    expect(chatSession.get().turns.map((turn) => turn.id)).toEqual(['t1', 't2']);
  });
});
