import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { ask, queue, runCombined, runJobAction } from './chatAsk.js';
import { chatStore } from './chatStore.js';
import { draftOf, setDraft } from './chatDrafts.js';
import { onScreenId, onOpenChat } from './activeChat.js';
import { onNotice } from './toast.js';
import { onMemoryChanged } from './memorySignal.js';
import { AT, fakeChats, generalChat, held, jobChat, compareChat, turn } from '../test/fixtures/chats.js';

vi.mock('../api.js', () => ({
  getChatPage: vi.fn(), listChats: vi.fn(), getChatsPending: vi.fn(), markChatSeen: vi.fn(), sendChatMessage: vi.fn(),
  runPostingAction: vi.fn(), queueChatMessage: vi.fn(), stopChat: vi.fn(), tailorForAll: vi.fn(), lettersForEach: vi.fn(),
}));

import * as api from '../api.js';

let server;
beforeEach(() => {
  vi.clearAllMocks();
  server = fakeChats(api, { chats: [generalChat('c1', 'hi'), jobChat('pA'), compareChat('cmp', ['pA', 'pB'])] });
});

describe('one call at a time, in the chat it was asked in', () => {
  it('runs in its own chat, refuses a second meanwhile, and lands its answer there', async () => {
    const first = held();
    api.sendChatMessage.mockImplementationOnce(() => first.gate);
    const asking = ask('c1', 'which are remote?', { page: 'postings' });
    expect(chatStore.get().busy).toMatchObject({ chatId: 'c1', kind: 'question', say: 'which are remote?', local: true });
    expect(await ask('c-pA', 'second')).toBeNull();
    expect(api.sendChatMessage).toHaveBeenCalledTimes(1);
    server.turns.c1 = [turn('which are remote?', 'Two.')];
    first.release({ ...turn('which are remote?', 'Two.'), chatId: 'c1' });
    await asking;
    expect(chatStore.get().busy).toBeNull();
    expect(chatStore.get().pages.c1.turns.map((t) => t.answer)).toEqual(['Two.']);
    expect(api.sendChatMessage.mock.calls[0].slice(0, 2)).toEqual(['c1', { message: 'which are remote?', page: 'postings' }]);
  });

  it('gives a job\'s chat asked by its placeholder its real id, and its draft goes with it', async () => {
    setDraft('job:pB', 'the next question');
    server.chats.push(jobChat('pB'));
    api.sendChatMessage.mockResolvedValueOnce({ ...turn('q', 'a'), chatId: 'c-pB' });
    await ask('job:pB', 'q');
    expect(chatStore.get().alias['job:pB']).toBe('c-pB');
    expect(draftOf('c-pB')).toBe('the next question');
  });

  it('marks the answer unseen and names its chat in a notice with a way there, with no panel open', async () => {
    const notices = [];
    const stop = onNotice((n) => notices.push(n));
    const opened = vi.fn();
    const stopOpen = onOpenChat(opened);
    api.sendChatMessage.mockResolvedValueOnce({ ...turn('q', 'a', { memory: [{ status: 'saved', text: 'Remote only' }] }), chatId: 'c-pA' });
    const remembered = vi.fn();
    const stopMemory = onMemoryChanged(remembered);
    await ask('c-pA', 'q');
    stop();
    stopMemory();
    expect(chatStore.get().unseen['c-pA']).toBe(true);
    expect(remembered).toHaveBeenCalled();
    expect(notices).toEqual([expect.objectContaining({ kind: 'done', title: 'AlphaCo · Your answer is ready' })]);
    notices[0].link.onClick();
    stopOpen();
    expect(onScreenId()).toBe('c-pA');
    expect(opened).toHaveBeenCalledWith('c-pA');
  });

  it('keeps a failure in the chat it was asked in, with how far it got', async () => {
    api.sendChatMessage.mockImplementationOnce(async (_id, _body, { onEvent }) => {
      onEvent({ event: 'start', provider: 'claude' });
      onEvent({ event: 'text', add: 'Both are' });
      throw Object.assign(new Error('Claude Code did not answer in time.'), { kind: 'timeout' });
    });
    await ask('c1', 'compare them', { page: 'postings' });
    expect(chatStore.get().failed.c1).toMatchObject({ question: 'compare them', kind: 'timeout', text: 'Both are', call: { kind: 'question', screen: { page: 'postings' } } });
    expect(chatStore.get().failed['c-pA']).toBeUndefined();
  });

  it('puts a refused question back in its draft and reads what is running instead', async () => {
    server.pending.busy = { chatId: 'c-pA', kind: 'action', label: 'Is it real?', action: 'fake-check', postingId: 'pA', startedAt: AT, provider: 'agy', stage: 'wait', web: false, text: '' };
    api.sendChatMessage.mockRejectedValueOnce(Object.assign(new Error('busy'), { status: 409, busy: { chatId: 'c-pA', label: 'Is it real?' } }));
    await ask('c1', 'is it remote?');
    expect(draftOf('c1')).toBe('is it remote?');
    expect(chatStore.get().failed.c1).toBeUndefined();
    await waitFor(() => expect(chatStore.get().busy).toMatchObject({ chatId: 'c-pA', remote: true, say: 'Is it real?' }));
  });
});

describe('job actions and a comparison\'s own actions', () => {
  it('runs a job action pressed in a comparison in the job\'s own chat, and reads the comparison\'s note once it starts', async () => {
    api.runPostingAction.mockImplementationOnce(async (_id, _kind, { onEvent }) => {
      onEvent({ event: 'start', provider: 'claude' });
      return { kind: 'fake-check', postingId: 'pA', chatId: 'c-pA', versions: [] };
    });
    await runJobAction('pA', 'fake-check', { askedIn: 'cmp' });
    expect(api.runPostingAction).toHaveBeenCalledWith('pA', 'fake-check', expect.objectContaining({ chatId: 'cmp', instruction: '' }));
    expect(api.getChatPage).toHaveBeenCalledWith('cmp');
    expect(api.getChatPage).toHaveBeenCalledWith('c-pA');
  });

  it('counts a comparison\'s letters as each one starts', async () => {
    const letters = held();
    api.lettersForEach.mockImplementationOnce(async (_id, { onEvent }) => {
      onEvent({ event: 'progress', stage: 'letter', index: 2, total: 3, postingId: 'pB', label: 'Cover letter 2 of 3' });
      return letters.gate;
    });
    const running = runCombined('cmp', 'letters-each');
    await waitFor(() => expect(chatStore.get().busy).toMatchObject({ chatId: 'cmp', label: 'Cover letter 2 of 3', letter: { index: 2, total: 3 }, say: 'Cover letter for each' }));
    letters.release({ ...turn('Cover letter for each', 'Wrote 3.'), chatId: 'cmp' });
    await running;
  });
});

describe('a follow-up', () => {
  it('waits in the busy chat, and is followed once the server sends it itself', async () => {
    const first = held();
    api.sendChatMessage.mockImplementationOnce(() => first.gate);
    const asking = ask('c1', 'first');
    await queue('c1', 'and the second?');
    expect(chatStore.get().waiting.c1).toMatchObject({ message: 'and the second?' });
    server.pending = { busy: { chatId: 'c1', kind: 'question', label: 'Answering', question: 'and the second?', startedAt: AT, provider: 'claude', stage: 'start', web: false, text: '' }, waiting: {}, failed: {} };
    first.release({ ...turn('first', 'one'), chatId: 'c1' });
    await asking;
    await waitFor(() => expect(chatStore.get().busy).toMatchObject({ chatId: 'c1', remote: true, say: 'and the second?' }));
    expect(chatStore.get().waiting.c1).toBeUndefined();
  });
});
