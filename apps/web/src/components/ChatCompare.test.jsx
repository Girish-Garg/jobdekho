import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import AiChatPanel from './AiChatPanel.jsx';
import { announceOpenPosting } from '../lib/openPostingSignal.js';
import { takeOpenRequest } from '../lib/openDocumentSignal.js';
import { onScreenId, pick } from '../lib/activeChat.js';
import { announceBlocked } from '../lib/blockedSignal.js';
import { compareChat, fakeChats, held, jobChat, turn, POSTINGS } from '../test/fixtures/chats.js';

vi.mock('../api.js', () => ({
  getProviders: vi.fn(),
  getProviderPreference: vi.fn(async () => ({ provider: 'auto' })),
  getChatPage: vi.fn(), listChats: vi.fn(), getChatsPending: vi.fn(), createChat: vi.fn(), markChatSeen: vi.fn(),
  clearChat: vi.fn(), deleteChat: vi.fn(), stopChat: vi.fn(), queueChatMessage: vi.fn(), changeChatItems: vi.fn(),
  sendChatMessage: vi.fn(), runPostingAction: vi.fn(), tailorForAll: vi.fn(), lettersForEach: vi.fn(),
  getPostingsPage: vi.fn(async () => ({ postings: [] })), listDocuments: vi.fn(async () => []),
}));

import * as api from '../api.js';

const CLAUDE = { id: 'claude', label: 'Claude Code', policies: ['none', 'web'], present: true, runs: true };
const TAILORED = turn('Tailor resume for all', 'Made "Tailored for AlphaCo + BetaCo" from your career record.', {
  combined: { kind: 'tailor-all', documentId: 'd9', name: 'Tailored for AlphaCo + BetaCo', jobs: ['pA', 'pB'], keywords: { used: [], missing: [] }, factCheck: { flags: [], ok: true }, coverage: null },
});
const LETTERS = turn('Cover letter for each', 'Wrote 2 cover letters.', {
  combined: { kind: 'letters-each', letters: [
    { postingId: 'pA', title: 'Job A Engineer', company: 'AlphaCo', status: 'written', chatId: 'c-pA' },
    { postingId: 'pB', title: 'Job B Analyst', company: 'BetaCo', status: 'failed', error: 'Claude Code did not answer in time.' },
  ] },
});

let server;
let apply;
const setup = () => render(<AiChatPanel open onClose={() => {}} context={{ filters: {}, sort: 'match', page: 'postings' }} apply={apply} />);

beforeEach(() => {
  vi.clearAllMocks();
  api.getProviders.mockResolvedValue([CLAUDE]);
  apply = { setView: vi.fn() };
  server = fakeChats(api, { chats: [compareChat('cmp', ['pA', 'pB']), jobChat('pA')], turns: { cmp: [turn('which pays more?', 'AlphaCo.')] } });
  announceOpenPosting(null);
  pick('cmp');
});

describe('a comparison', () => {
  it('holds its jobs as chips anyone can take out, and offers its own two actions', async () => {
    setup();
    expect(await screen.findByText('Comparing 2 jobs')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Take Job A Engineer · AlphaCo out of this chat' })).toBeInTheDocument();
    const group = screen.getByRole('group', { name: 'Actions for these jobs' });
    expect(within(group).getByRole('button', { name: 'Tailor resume for all' })).toBeEnabled();
    expect(within(group).getByRole('button', { name: 'Cover letter for each' })).toBeEnabled();
  });

  it('tailors one resume for all and shows it as a card with the way to the document and to each job\'s chat', async () => {
    api.tailorForAll.mockImplementationOnce(async (id) => server.reply(id, TAILORED));
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Tailor resume for all' }));
    const card = await screen.findByRole('region', { name: 'Tailored for all' });
    expect(card).toHaveTextContent('Tailored for AlphaCo + BetaCo');
    fireEvent.click(within(card).getByRole('button', { name: 'Open it' }));
    expect(apply.setView).toHaveBeenCalledWith('resume');
    expect(takeOpenRequest()).toBe('d9');
    fireEvent.click(within(card).getByRole('button', { name: 'BetaCo' }));
    expect(onScreenId()).toBe('job:pB');
  });

  it('counts the letters as each is written, and lists them on one card linking to each job\'s chat', async () => {
    const letters = held();
    api.lettersForEach.mockImplementationOnce(async (id, { onEvent }) => {
      onEvent({ event: 'start', provider: 'claude' });
      onEvent({ event: 'progress', stage: 'letter', index: 2, total: 2, postingId: 'pB', label: 'Cover letter 2 of 2' });
      await letters.gate;
      return server.reply(id, LETTERS);
    });
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Cover letter for each' }));
    expect(await screen.findByText('Claude Code, 2 of 2 letters')).toBeInTheDocument();
    await act(async () => letters.release());
    const card = await screen.findByRole('region', { name: 'Cover letters' });
    expect(card).toHaveTextContent('1 of 2 written');
    expect(card).toHaveTextContent('Claude Code did not answer in time.');
    fireEvent.click(within(card).getByRole('button', { name: 'Open AlphaCo\'s chat' }));
    expect(onScreenId()).toBe('c-pA');
  });

  it('offers each job\'s own actions on its chip, run in the job\'s own chat while the comparison stays on screen', async () => {
    api.runPostingAction.mockImplementationOnce(async (postingId, kind) => {
      server.turns.cmp = [...server.turns.cmp, { id: 'n2', note: { kind: 'started', action: kind, label: 'Cover letter', postingId, chatId: 'c-pB', title: 'Job B Analyst · BetaCo' }, createdAt: '2026-10-03T10:07:00.000Z', items: {} }];
      return { kind, postingId, chatId: 'c-pB', versions: [], result: {} };
    });
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Job B Analyst · BetaCo' }));
    const menu = screen.getByRole('group', { name: 'Job B Analyst · BetaCo' });
    fireEvent.click(within(menu).getByRole('button', { name: 'Write a cover letter' }));
    await waitFor(() => expect(api.runPostingAction).toHaveBeenCalledWith('pB', 'cover-letter', expect.objectContaining({ chatId: 'cmp' })));
    expect(await screen.findByText(/Started Cover letter in/)).toBeInTheDocument();
    expect(onScreenId()).toBe('cmp');
  });

  it('runs a job action pressed from the pane in the job\'s own chat, keeps a note of it here, and stays put', async () => {
    const run = held();
    api.runPostingAction.mockImplementationOnce(async (postingId, kind, { onEvent }) => {
      server.turns.cmp = [...server.turns.cmp, { id: 'n1', note: { kind: 'started', action: kind, label: 'Is it real?', postingId, chatId: 'c-pA', title: 'Job A Engineer · AlphaCo' }, createdAt: '2026-10-03T10:06:00.000Z', items: {} }];
      onEvent({ event: 'start', provider: 'claude' });
      await run.gate;
      return { kind, postingId, chatId: 'c-pA', versions: [], result: {} };
    });
    const { rerender } = setup();
    await screen.findByText('Comparing 2 jobs');
    fireEvent.click(screen.getByRole('button', { name: 'Keep this chat on screen' }));
    act(() => announceOpenPosting(POSTINGS.pA));
    rerender(<AiChatPanel open onClose={() => {}} context={{ filters: {}, sort: 'match', page: 'postings' }} apply={apply} request={{ id: 70_000, posting: POSTINGS.pA, action: 'fake-check' }} />);
    await waitFor(() => expect(api.runPostingAction).toHaveBeenCalledWith('pA', 'fake-check', expect.objectContaining({ chatId: 'cmp' })));
    const note = await screen.findByText(/Started Is it real\? in/);
    expect(onScreenId()).toBe('cmp');
    expect(screen.queryByRole('region', { name: 'Answer in progress' })).not.toBeInTheDocument();
    fireEvent.click(within(note.closest('p')).getByRole('button', { name: 'AlphaCo\'s chat' }));
    expect(onScreenId()).toBe('c-pA');
    expect(await screen.findByRole('region', { name: 'Answer in progress' })).toBeInTheDocument();
    await act(async () => run.release());
  });
});

describe('what a chat says about itself', () => {
  it('says older messages were removed, never silently', async () => {
    const page = api.getChatPage.getMockImplementation();
    api.getChatPage.mockImplementation(async (id) => ({ ...(await page(id)), dropped: id === 'cmp' }));
    setup();
    expect(await screen.findByText('Older messages were removed')).toBeInTheDocument();
  });

  it('reads the chat again when its company is blocked, and then says its job is no longer listed', async () => {
    pick('c-pA');
    setup();
    await screen.findByText('AlphaCo · this job\'s chat');
    server.chats = server.chats.map((chat) => (chat.id === 'c-pA' ? jobChat('pA', { listed: false, jobs: [{ ...POSTINGS.pA, listed: false }] }) : chat));
    act(() => announceBlocked(['AlphaCo']));
    expect(await screen.findByText('AlphaCo · this job\'s chat · no longer listed')).toBeInTheDocument();
  });

  it('marks a job\'s chat whose job JobDekho no longer lists, in the header and on its chip', async () => {
    server.chats = server.chats.map((chat) => (chat.id === 'c-pA' ? jobChat('pA', { listed: false, jobs: [{ ...POSTINGS.pA, listed: false }] }) : chat));
    pick('c-pA');
    setup();
    expect(await screen.findByText('AlphaCo · this job\'s chat · no longer listed')).toBeInTheDocument();
    expect(screen.getByText('no longer listed')).toBeInTheDocument();
  });
});
