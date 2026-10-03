import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import AiChatPanel from './AiChatPanel.jsx';
import { announceOpenPosting } from '../lib/openPostingSignal.js';
import { chatStore } from '../lib/chatStore.js';
import { onScreenId } from '../lib/activeChat.js';
import { onNotice } from '../lib/toast.js';
import { fakeChats, generalChat, held, jobChat, result, turn, version, POSTINGS } from '../test/fixtures/chats.js';

// More of the chat study's reproductions, kept as tests of the behaviour
// that fixed them: what waits, what lands while the panel is closed or a
// chat is being read, and a check that outlives a reload.
vi.mock('../api.js', () => ({
  getProviders: vi.fn(),
  getProviderPreference: vi.fn(async () => ({ provider: 'auto' })),
  getChatPage: vi.fn(), listChats: vi.fn(), getChatsPending: vi.fn(), createChat: vi.fn(), markChatSeen: vi.fn(),
  clearChat: vi.fn(), deleteChat: vi.fn(), stopChat: vi.fn(), queueChatMessage: vi.fn(), changeChatItems: vi.fn(),
  sendChatMessage: vi.fn(), runPostingAction: vi.fn(), tailorForAll: vi.fn(), lettersForEach: vi.fn(),
  getPostingsPage: vi.fn(async () => ({ postings: [] })), listDocuments: vi.fn(async () => []), createDocument: vi.fn(),
}));

import * as api from '../api.js';

const CLAUDE = { id: 'claude', label: 'Claude Code', policies: ['none', 'web'], present: true, runs: true, error: null };
const LETTER = { letter: 'A long letter.', usedFromResume: [], notClaimed: [] };
const VERDICT = { verdict: 'probably_genuine', summary: 'Looks real.', stillOpen: true, redFlags: [], checks: [] };
const { pA: A, pB: B } = POSTINGS;

let server;
const panel = (open, apply = { setView: vi.fn() }) => <AiChatPanel open={open} onClose={() => {}} context={{ filters: {}, sort: 'match', page: 'postings' }} apply={apply} />;
const box = () => screen.findByRole('textbox', { name: 'Ask about what is on screen' });
const send = async (text) => {
  fireEvent.change(await box(), { target: { value: text } });
  fireEvent.keyDown(await box(), { key: 'Enter' });
};
// A first question the test answers when it chooses.
function heldQuestion(answer = 'first answer') {
  const first = held();
  api.sendChatMessage.mockImplementationOnce(async (id, body) => {
    await first.gate;
    return server.reply(id, turn(body.message, answer));
  });
  return first;
}
const letterSaved = () => {
  server.chats.push(jobChat('pA'));
  server.results['c-pA'] = [result('cover-letter', 'pA', [version(LETTER, '2026-10-03T09:00:00.000Z', 'c-pA')])];
};

beforeEach(() => {
  vi.clearAllMocks();
  api.getProviders.mockResolvedValue([CLAUDE]);
  server = fakeChats(api, { chats: [generalChat('g1', 'hi')], turns: { g1: [turn('hi', 'hello')] } });
  announceOpenPosting(null);
});

it('keeps a follow-up waiting with the server when the panel closes before the answer lands', async () => {
  const first = heldQuestion();
  const { rerender } = render(panel(true));
  await send('first');
  await screen.findByRole('region', { name: 'Answer in progress' });
  await send('queued one');
  expect(await screen.findByText('queued one')).toBeInTheDocument();
  rerender(panel(false));
  rerender(panel(true));
  expect(await screen.findByRole('region', { name: 'Answer in progress' })).toBeInTheDocument();
  expect(screen.getByText(/Sends once this answer is in/)).toHaveTextContent('queued one');
  expect(api.queueChatMessage).toHaveBeenCalledWith('g1', expect.objectContaining({ message: 'queued one' }));
  await act(async () => first.release());
});

it('holds a refine of A\'s card back while a call runs, and never sends it as a question once the job changes', async () => {
  letterSaved();
  announceOpenPosting(A);
  const first = heldQuestion();
  render(panel(true));
  await screen.findByRole('region', { name: 'Cover letter' });
  await send('first');
  await screen.findByRole('region', { name: 'Answer in progress' });
  fireEvent.click(screen.getByRole('button', { name: 'Change this' }));
  const refine = screen.getByRole('textbox', { name: 'What should change in the letter?' });
  fireEvent.change(refine, { target: { value: 'make it shorter' } });
  expect(screen.getByRole('button', { name: 'Change' })).toBeDisabled();
  fireEvent.keyDown(refine, { key: 'Enter' });
  act(() => announceOpenPosting(B));
  await act(async () => first.release());
  await waitFor(() => expect(chatStore.get().busy).toBeNull());
  expect(api.sendChatMessage).toHaveBeenCalledTimes(1);
  expect(api.queueChatMessage).not.toHaveBeenCalled();
  expect(api.runPostingAction).not.toHaveBeenCalled();
});

it('holds "Tailor my resume and make both" back, with why, while another call runs, rather than making the letter alone', async () => {
  letterSaved();
  announceOpenPosting(A);
  const first = heldQuestion();
  render(panel(true));
  const card = await screen.findByRole('region', { name: 'Cover letter' });
  await send('first');
  await screen.findByRole('region', { name: 'Answer in progress' });
  const both = within(card).getByRole('button', { name: 'Tailor my resume and make both' });
  expect(both).toBeDisabled();
  expect(both).toHaveAttribute('title', 'Claude Code is answering in AlphaCo\'s chat. You can send once it\'s done.');
  fireEvent.click(both);
  expect(api.createDocument).not.toHaveBeenCalled();
  await act(async () => first.release());
});

it('marks a check that lands with the panel closed unseen in its own chat, and its notice opens that chat', async () => {
  announceOpenPosting(A);
  const run = held();
  api.runPostingAction.mockImplementationOnce(async () => {
    await run.gate;
    server.chats.push(jobChat('pA'));
    server.results['c-pA'] = [result('fake-check', 'pA', [version(VERDICT, '2026-10-03T12:00:00.000Z', 'c-pA')])];
    return { kind: 'fake-check', postingId: 'pA', chatId: 'c-pA', versions: [], result: VERDICT };
  });
  const notices = [];
  const stop = onNotice((n) => notices.push(n));
  const { rerender } = render(panel(true));
  fireEvent.click(await screen.findByRole('button', { name: 'Is it real?' }));
  await screen.findByRole('region', { name: 'Answer in progress' });
  rerender(panel(false));
  act(() => announceOpenPosting(B));
  await act(async () => run.release());
  await waitFor(() => expect(chatStore.get().unseen['c-pA']).toBe(true));
  stop();
  expect(notices).toEqual([expect.objectContaining({ title: 'AlphaCo · Is it real? is ready' })]);
  act(() => notices[0].link.onClick());
  expect(onScreenId()).toBe('c-pA');
  rerender(panel(true));
  expect(await screen.findByRole('region', { name: 'Is it real?' })).toBeInTheDocument();
});

it('leaves a failure that lands after New chat in the chat it was asked in, not the new one', async () => {
  const first = held();
  api.sendChatMessage.mockImplementationOnce(() => first.gate);
  render(panel(true));
  await screen.findByText('hello');
  await send('asked in g1');
  await screen.findByRole('region', { name: 'Answer in progress' });
  fireEvent.click(screen.getByRole('button', { name: 'New chat' }));
  await screen.findByText(/Ask about the postings on screen/);
  await act(async () => first.fail(Object.assign(new Error('timed out'), { kind: 'timeout' })));
  await waitFor(() => expect(chatStore.get().failed.g1).toBeTruthy());
  expect(screen.queryByRole('button', { name: 'Ask again' })).not.toBeInTheDocument();
  expect(screen.queryByText('asked in g1')).not.toBeInTheDocument();
});

it('shows a result that lands while its chat is being read again, since the newer read wins', async () => {
  announceOpenPosting(A);
  const run = held();
  api.runPostingAction.mockImplementationOnce(async () => {
    await run.gate;
    server.chats.push(jobChat('pA'));
    server.results['c-pA'] = [result('cover-letter', 'pA', [version(LETTER, '2026-10-03T12:00:00.000Z', 'c-pA')])];
    return { kind: 'cover-letter', postingId: 'pA', chatId: 'c-pA', versions: [], result: LETTER };
  });
  render(panel(true));
  fireEvent.click(await screen.findByRole('button', { name: 'Write a cover letter' }));
  await screen.findByRole('region', { name: 'Answer in progress' });
  act(() => announceOpenPosting(B));
  await screen.findByText('BetaCo · this job\'s chat');
  const reread = held();
  const page = api.getChatPage.getMockImplementation();
  api.getChatPage.mockImplementationOnce(async (id) => {
    const stale = await page(id);
    await reread.gate;
    return stale;
  });
  act(() => announceOpenPosting(A));
  await act(async () => run.release());
  await act(async () => reread.release());
  await waitFor(() => expect(chatStore.get().busy).toBeNull());
  expect(await screen.findByRole('region', { name: 'Cover letter' })).toBeInTheDocument();
});

it('shows a check asked before a reload as running again, in its own chat only', async () => {
  server.chats.push(jobChat('pA'));
  server.pending.busy = {
    chatId: 'c-pA', kind: 'action', label: 'Is it real?', action: 'fake-check', postingId: 'pA',
    startedAt: new Date().toISOString(), provider: 'claude', stage: 'wait', web: false, text: '', title: 'Job A Engineer · AlphaCo',
  };
  render(panel(true));
  await screen.findByText('hello');
  expect(screen.queryByRole('region', { name: 'Answer in progress' })).not.toBeInTheDocument();
  expect(await screen.findByRole('status')).toHaveTextContent('Is it real? is running in AlphaCo\'s chat.');
  act(() => announceOpenPosting(A));
  const card = await screen.findByRole('region', { name: 'Answer in progress' });
  expect(within(card).getByText(/Claude Code/)).toBeInTheDocument();
  expect(screen.getByText('Is it real?', { selector: 'p' })).toBeInTheDocument();
});
