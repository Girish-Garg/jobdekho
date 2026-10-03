import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import AiChatPanel from './AiChatPanel.jsx';
import { announceOpenPosting } from '../lib/openPostingSignal.js';
import { onScreenId } from '../lib/activeChat.js';
import { compareChat, fakeChats, generalChat, jobChat, turn, POSTINGS, DOCUMENTS } from '../test/fixtures/chats.js';

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
let server;
const setup = () => render(<AiChatPanel open onClose={() => {}} context={{ filters: {}, sort: 'match', page: 'postings' }} apply={{ setView: vi.fn() }} />);
const chips = () => within(screen.getByRole('list', { name: 'In this chat' }));
const openAdd = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'Add' }));
  return screen.findByRole('dialog', { name: 'Add to this chat' });
};

beforeEach(() => {
  vi.clearAllMocks();
  api.getProviders.mockResolvedValue([CLAUDE]);
  api.listDocuments.mockResolvedValue([DOCUMENTS.d1, DOCUMENTS.d2]);
  server = fakeChats(api, { chats: [generalChat('g1', 'hi')], turns: { g1: [turn('hi', 'hello')] } });
  announceOpenPosting(null);
});

describe('what a chat holds', () => {
  it('shows a job\'s chat with its job as a chip that cannot be taken out', async () => {
    announceOpenPosting(POSTINGS.pA);
    setup();
    await screen.findByText('AlphaCo · this job\'s chat');
    expect(chips().getByRole('button', { name: 'Job A Engineer · AlphaCo' })).toBeInTheDocument();
    expect(chips().queryByRole('button', { name: /Take .* out of this chat/ })).not.toBeInTheDocument();
  });

  it('offers the jobs opened lately and the documents, and starts a comparison when a job is added to a job\'s chat', async () => {
    announceOpenPosting(POSTINGS.pB);
    announceOpenPosting(POSTINGS.pA);
    const comparison = compareChat('cmp', ['pA', 'pB']);
    api.changeChatItems.mockImplementation(async () => {
      server.chats.push(comparison);
      return comparison;
    });
    setup();
    await screen.findByText('AlphaCo · this job\'s chat');
    const picker = await openAdd();
    expect(within(picker).getByRole('region', { name: 'Your documents' })).toHaveTextContent('Classic resume');
    fireEvent.click(within(within(picker).getByRole('region', { name: 'Opened lately' })).getByRole('button', { name: /Job B Analyst/ }));
    await waitFor(() => expect(onScreenId()).toBe('cmp'));
    expect(api.changeChatItems).toHaveBeenCalledWith('job:pA', { action: 'add', type: 'job', id: 'pB' });
    expect(await screen.findByText('Comparing 2 jobs')).toBeInTheDocument();
    expect(chips().getByRole('button', { name: 'Take Job B Analyst · BetaCo out of this chat' })).toBeInTheDocument();
  });

  it('adds a document in place, and its x takes it out again', async () => {
    server.chats.push(jobChat('pA'));
    const withDoc = jobChat('pA', { documents: [{ ...DOCUMENTS.d1, exists: true }] });
    api.changeChatItems.mockImplementation(async (_id, change) => {
      const next = change.action === 'add' ? withDoc : jobChat('pA');
      server.chats = server.chats.map((chat) => (chat.id === 'c-pA' ? next : chat));
      return next;
    });
    announceOpenPosting(POSTINGS.pA);
    setup();
    const picker = await openAdd();
    fireEvent.click(within(picker).getByRole('button', { name: /Classic resume/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Take Classic resume out of this chat' }));
    await waitFor(() => expect(api.changeChatItems).toHaveBeenLastCalledWith('c-pA', { action: 'remove', type: 'document', id: 'd1' }));
    await waitFor(() => expect(chips().queryByRole('button', { name: 'Classic resume' })).not.toBeInTheDocument());
  });

  it('says why in the server\'s own words when an item cannot be added', async () => {
    api.changeChatItems.mockRejectedValue(new Error('A job\'s chat holds up to 3 documents.'));
    announceOpenPosting(POSTINGS.pA);
    setup();
    const picker = await openAdd();
    fireEvent.click(within(picker).getByRole('button', { name: /Classic resume/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('A job\'s chat holds up to 3 documents.');
  });
});

describe('a general chat\'s "+ Add"', () => {
  it('offers documents and Compare jobs, which needs two or more and starts a comparison of them', async () => {
    act(() => announceOpenPosting(POSTINGS.pA));
    act(() => announceOpenPosting(POSTINGS.pB));
    act(() => announceOpenPosting(null));
    setup();
    await screen.findByText('hello');
    const picker = await openAdd();
    expect(within(picker).queryByRole('region', { name: 'Opened lately' })).not.toBeInTheDocument();
    expect(within(picker).getByRole('region', { name: 'Your documents' })).toBeInTheDocument();
    fireEvent.click(within(picker).getByRole('button', { name: 'Compare jobs' }));
    expect(within(picker).getByRole('button', { name: 'Pick two or more' })).toBeDisabled();
    fireEvent.click(within(picker).getByRole('button', { name: /Job A Engineer/ }));
    fireEvent.click(within(picker).getByRole('button', { name: /Job B Analyst/ }));
    fireEvent.click(within(picker).getByRole('button', { name: 'Compare 2 jobs' }));
    await waitFor(() => expect(api.createChat).toHaveBeenCalledWith({ kind: 'compare', jobs: ['pA', 'pB'] }));
    expect(await screen.findByText('Comparing 2 jobs')).toBeInTheDocument();
  });
});
