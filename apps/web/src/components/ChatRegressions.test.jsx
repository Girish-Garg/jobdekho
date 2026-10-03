import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import AiChatPanel from './AiChatPanel.jsx';
import { announceOpenPosting } from '../lib/openPostingSignal.js';
import { chatStore } from '../lib/chatStore.js';
import { fakeChats, generalChat, held, jobChat, result, turn, version, POSTINGS } from '../test/fixtures/chats.js';

// The chat study's reproductions of the bugs one shared conversation caused
// (a running check, a result, a draft, a failure following the person into
// whichever chat was on screen), kept as tests of the behaviour that fixed
// them. Each asserts the fixed behaviour, not the bug.
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
const VERDICT = { verdict: 'probably_genuine', summary: 'Looks real.', stillOpen: true, redFlags: [], checks: [] };
const { pA: A, pB: B } = POSTINGS;

let server;
const setup = () => render(<AiChatPanel open onClose={() => {}} context={{ filters: {}, sort: 'match', page: 'postings' }} apply={{ setView: vi.fn() }} />);
const box = () => screen.findByRole('textbox', { name: 'Ask about what is on screen' });
const inProgress = () => screen.queryByRole('region', { name: 'Answer in progress' });
const header = (company) => screen.findByText(`${company} · this job's chat`);

// A job action the test lets finish when it chooses, saved as the server
// saves it: in the job's own chat.
function heldAction(kind, value) {
  const run = held();
  api.runPostingAction.mockImplementationOnce(async (postingId) => {
    await run.gate;
    if (!server.chats.some((chat) => chat.id === `c-${postingId}`)) server.chats.push(jobChat(postingId));
    const versions = [version(value, '2026-10-03T12:00:00.000Z', `c-${postingId}`)];
    server.results[`c-${postingId}`] = [result(kind, postingId, versions)];
    return { kind, postingId, chatId: `c-${postingId}`, versions, result: value };
  });
  return run;
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getProviders.mockResolvedValue([CLAUDE]);
  server = fakeChats(api, { chats: [generalChat('g1', 'older question')], turns: { g1: [turn('older question', 'older answer')] } });
  announceOpenPosting(null);
});

describe('a running check, and where its verdict lands', () => {
  it('shows a check\'s thinking card only in its job\'s chat, and its verdict only there', async () => {
    announceOpenPosting(A);
    const run = heldAction('fake-check', VERDICT);
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Is it real?' }));
    await screen.findByRole('region', { name: 'Answer in progress' });
    act(() => announceOpenPosting(B));
    await header('BetaCo');
    expect(inProgress()).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Is it real? is running in AlphaCo\'s chat.');
    await act(async () => run.release());
    await waitFor(() => expect(chatStore.get().busy).toBeNull());
    expect(screen.queryByRole('region', { name: 'Is it real?' })).not.toBeInTheDocument();
    act(() => announceOpenPosting(A));
    expect(await screen.findByRole('region', { name: 'Is it real?' })).toBeInTheDocument();
  });

  it('keeps a running check and its verdict out of a new chat started meanwhile', async () => {
    announceOpenPosting(A);
    const run = heldAction('fake-check', VERDICT);
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Is it real?' }));
    await screen.findByRole('region', { name: 'Answer in progress' });
    fireEvent.click(screen.getByRole('button', { name: 'New chat' }));
    await screen.findByText(/Ask about the postings on screen/);
    expect(inProgress()).not.toBeInTheDocument();
    await act(async () => run.release());
    await waitFor(() => expect(chatStore.get().unseen['c-pA']).toBe(true));
    expect(screen.queryByRole('region', { name: 'Is it real?' })).not.toBeInTheDocument();
    expect(screen.getByText(/Ask about the postings on screen/)).toBeInTheDocument();
  });
});

describe('the draft in the box', () => {
  it('stays with the chat it was typed in, through a job switch and a new chat', async () => {
    announceOpenPosting(A);
    setup();
    await header('AlphaCo');
    fireEvent.change(await box(), { target: { value: 'half-typed about A' } });
    act(() => announceOpenPosting(B));
    await header('BetaCo');
    expect(await box()).toHaveValue('');
    fireEvent.change(await box(), { target: { value: 'about B' } });
    fireEvent.click(screen.getByRole('button', { name: 'New chat' }));
    await screen.findByText(/Ask about the postings on screen/);
    expect(await box()).toHaveValue('');
    act(() => announceOpenPosting(A));
    await header('AlphaCo');
    expect(await box()).toHaveValue('half-typed about A');
    expect(JSON.parse(localStorage.getItem('jobdekho-chat-drafts'))).toEqual({ 'job:pA': 'half-typed about A', 'job:pB': 'about B' });
  });
});

describe('where a question goes', () => {
  it('keeps a follow-up typed in A\'s chat for A\'s chat, however the pane moves before it is sent', async () => {
    announceOpenPosting(A);
    const first = held();
    api.sendChatMessage.mockImplementationOnce(async (id, body) => {
      await first.gate;
      return server.reply(id, turn(body.message, 'first answer'));
    });
    setup();
    fireEvent.change(await box(), { target: { value: 'first' } });
    fireEvent.keyDown(await box(), { key: 'Enter' });
    await screen.findByRole('region', { name: 'Answer in progress' });
    fireEvent.change(await box(), { target: { value: 'about A?' } });
    fireEvent.keyDown(await box(), { key: 'Enter' });
    expect(await screen.findByText('about A?')).toBeInTheDocument();
    act(() => announceOpenPosting(B));
    await header('BetaCo');
    await act(async () => first.release());
    expect(api.queueChatMessage).toHaveBeenCalledWith('job:pA', expect.objectContaining({ message: 'about A?' }));
    expect(api.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(api.sendChatMessage.mock.calls[0][0]).toBe('job:pA');
  });

  it('lands an answer about A in A\'s chat, never in B\'s on screen', async () => {
    announceOpenPosting(A);
    const first = held();
    api.sendChatMessage.mockImplementationOnce(async (id, body) => {
      await first.gate;
      return server.reply(id, turn(body.message, 'A is remote.'));
    });
    setup();
    fireEvent.change(await box(), { target: { value: 'is A remote?' } });
    fireEvent.keyDown(await box(), { key: 'Enter' });
    await screen.findByRole('region', { name: 'Answer in progress' });
    act(() => announceOpenPosting(B));
    await header('BetaCo');
    await act(async () => first.release());
    await waitFor(() => expect(chatStore.get().unseen['c-pA']).toBe(true));
    expect(screen.queryByText('A is remote.')).not.toBeInTheDocument();
    act(() => announceOpenPosting(A));
    expect(await screen.findByText('A is remote.')).toBeInTheDocument();
  });
});

describe('leftovers across switches', () => {
  it('keeps a missed question in the chat it was asked in, and out of every other', async () => {
    api.sendChatMessage.mockRejectedValueOnce(Object.assign(new Error('Claude Code did not answer within 180 seconds.'), { kind: 'timeout' }));
    setup();
    await screen.findByText('older answer');
    fireEvent.change(await box(), { target: { value: 'timed out question' } });
    fireEvent.keyDown(await box(), { key: 'Enter' });
    expect(await screen.findByRole('button', { name: 'Ask again' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'New chat' }));
    await screen.findByText(/Ask about the postings on screen/);
    expect(screen.queryByText('timed out question')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ask again' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /switch chats/ }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Your chats' })).getByRole('button', { name: /^older question/ }));
    expect(await screen.findByText('timed out question')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ask again' })).toBeInTheDocument();
  });

  it('shows a failed action on job A in A\'s chat only', async () => {
    announceOpenPosting(A);
    api.runPostingAction.mockRejectedValueOnce(Object.assign(new Error('Upload a resume first.'), { kind: undefined }));
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Write a cover letter' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Upload a resume first.');
    act(() => announceOpenPosting(B));
    await header('BetaCo');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    act(() => announceOpenPosting(A));
    expect(await screen.findByRole('alert')).toHaveTextContent('Upload a resume first.');
  });

  it('refuses a pane action that arrives while another call runs, and never starts it later', async () => {
    announceOpenPosting(B);
    const first = held();
    api.sendChatMessage.mockImplementationOnce(async (id, body) => {
      await first.gate;
      return server.reply(id, turn(body.message, 'done'));
    });
    const { rerender } = setup();
    fireEvent.change(await box(), { target: { value: 'something' } });
    fireEvent.keyDown(await box(), { key: 'Enter' });
    await screen.findByRole('region', { name: 'Answer in progress' });
    rerender(<AiChatPanel open onClose={() => {}} context={{ filters: {}, sort: 'match', page: 'postings' }} apply={{}} request={{ id: 50_000, posting: A, action: 'fake-check' }} />);
    await header('AlphaCo');
    await act(async () => first.release());
    await waitFor(() => expect(chatStore.get().busy).toBeNull());
    act(() => announceOpenPosting(A));
    act(() => announceOpenPosting(B));
    await header('BetaCo');
    act(() => announceOpenPosting(A));
    await header('AlphaCo');
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(api.runPostingAction).not.toHaveBeenCalled();
  });
});
