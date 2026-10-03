import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { loadPending, syncPending } from './chatPending.js';
import { chatStore } from './chatStore.js';
import { onNotice } from './toast.js';
import { fakeChats, generalChat, jobChat, result, version } from '../test/fixtures/chats.js';

vi.mock('../api.js', () => ({ getChatPage: vi.fn(), listChats: vi.fn(), getChatsPending: vi.fn(), markChatSeen: vi.fn() }));

import * as api from '../api.js';

const STARTED = '2026-10-03T11:00:00.000Z';
const CHECK = {
  chatId: 'c-pA', kind: 'action', label: 'Is it real?', action: 'fake-check', postingId: 'pA',
  startedAt: STARTED, provider: 'agy', stage: 'wait', web: false, text: '', title: 'Job A Engineer · AlphaCo',
};
const VERDICT = { verdict: 'probably_genuine', summary: 'Looks real.', redFlags: [], checks: [] };

let server;
beforeEach(() => {
  vi.clearAllMocks();
  server = fakeChats(api, { chats: [generalChat('c1', 'hi'), jobChat('pA')] });
});

describe('what the server runs that this page did not start', () => {
  it('shows a check asked before a reload as running in its own chat, from when it started', async () => {
    server.pending.busy = CHECK;
    await syncPending();
    expect(chatStore.get().busy).toMatchObject({ chatId: 'c-pA', kind: 'action', say: 'Is it real?', remote: true, provider: 'agy', startedAt: Date.parse(STARTED) });
  });

  it('follows it until it ends, then lands the answer in its chat alone, unseen and announced', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const notices = [];
    const stop = onNotice((n) => notices.push(n));
    server.pending.busy = CHECK;
    await syncPending();
    server.pending.busy = null;
    server.results['c-pA'] = [result('fake-check', 'pA', [version(VERDICT, '2026-10-03T11:02:00.000Z', 'c-pA')])];
    await vi.advanceTimersByTimeAsync(2100);
    vi.useRealTimers();
    await waitFor(() => expect(chatStore.get().busy).toBeNull());
    await waitFor(() => expect(chatStore.get().unseen['c-pA']).toBe(true));
    stop();
    expect(chatStore.get().unseen.c1).toBeUndefined();
    expect(chatStore.get().alias['job:pA']).toBe('c-pA');
    expect(notices).toEqual([expect.objectContaining({ title: 'AlphaCo · Is it real? is ready' })]);
  });

  it('lands nothing for a call that ended without an answer, as a stop does', async () => {
    server.pending.busy = CHECK;
    await syncPending();
    server.pending.busy = null;
    await syncPending();
    await waitFor(() => expect(api.getChatPage).toHaveBeenCalledWith('c-pA'));
    expect(chatStore.get().unseen['c-pA']).toBeUndefined();
  });

  it('keeps each chat\'s failure as its missed card, and what each chat has waiting', async () => {
    server.pending.failed = { c1: { kind: 'question', label: 'Answering', question: 'who hires freshers?', error: 'Antigravity is not signed in.', at: STARTED } };
    server.pending.waiting = { 'c-pA': { message: 'and the pay?', at: STARTED } };
    await syncPending();
    expect(chatStore.get().failed).toEqual({ c1: expect.objectContaining({ question: 'who hires freshers?', message: 'Antigravity is not signed in.', call: expect.objectContaining({ kind: 'question' }) }) });
    expect(chatStore.get().waiting).toEqual({ 'c-pA': { message: 'and the pay?', at: STARTED } });
  });

  it('reads once per page, with the list, however often the panel opens', async () => {
    loadPending();
    loadPending();
    await waitFor(() => expect(api.listChats).toHaveBeenCalledTimes(1));
    expect(api.getChatsPending).toHaveBeenCalledTimes(1);
  });
});
