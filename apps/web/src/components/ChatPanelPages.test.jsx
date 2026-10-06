import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AiChatPanel from './AiChatPanel.jsx';
import { announceOpenPosting, onOpenPostingRequest } from '../lib/openPostingSignal.js';
import { announceOpenDocument } from '../lib/openDocumentSignal.js';
import { fakeChats, generalChat, turn, POSTINGS, DOCUMENTS } from '../test/fixtures/chats.js';

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
const FILTERS = { levels: [], workModes: [], q: '', minFit: '' };
const TURN = turn('which are remote?', 'Two of these are remote.', {
  refs: [{ id: 'p1', title: 'Frontend Intern', company: 'Acme', fit: 55 }],
  actions: [{ type: 'filters', patch: { workModes: ['remote'] }, label: 'Show remote' }],
});

let server;
const panel = (page, apply) => <AiChatPanel open onClose={() => {}} context={{ filters: FILTERS, sort: 'match', page }} apply={apply} />;
function setup(page) {
  const apply = { setFilters: vi.fn(), setSort: vi.fn(), setView: vi.fn() };
  return { ...render(panel(page, apply)), apply };
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getProviders.mockResolvedValue([CLAUDE]);
  server = fakeChats(api, { chats: [generalChat('g1', 'which are remote?')] });
  announceOpenPosting(null);
  announceOpenDocument(null);
});

describe('the chat on a page other than the feed', () => {
  it('answers a general chat from the page it is asked on, with that page\'s own questions', async () => {
    setup('profile');
    fireEvent.click(await screen.findByRole('button', { name: 'Add a project I built' }));
    await waitFor(() => expect(api.sendChatMessage).toHaveBeenCalledWith(
      expect.stringMatching(/^c-general/), { message: 'Add a project I built', filters: FILTERS, sort: 'match', page: 'profile' }, { onEvent: expect.any(Function) },
    ));
  });

  // A job no longer looked at is no longer what the chat is about (see
  // lib/activeChat.js): moving on puts back the chat from before.
  it('lets go of the job\'s chat when the person moves on from the feed', async () => {
    announceOpenPosting(POSTINGS.p9);
    const apply = { setView: vi.fn() };
    const { rerender } = render(panel('postings', apply));
    expect(await screen.findByText('Initech · this job\'s chat')).toBeInTheDocument();
    rerender(panel('profile', apply));
    announceOpenPosting(null);
    await waitFor(() => expect(screen.queryByText('Initech · this job\'s chat')).not.toBeInTheDocument());
  });

  it('suggests document requests on the resume page', async () => {
    setup('resume');
    expect(await screen.findByRole('button', { name: 'Make it fit one page' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Write a cover letter' })).toBeInTheDocument();
  });

  it('shows the open document\'s own chat on the resume page, and asks there', async () => {
    setup('resume');
    announceOpenDocument(DOCUMENTS.d1);
    expect(await screen.findByText('Resume · this document\'s chat')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Make it fit one page' }));
    await waitFor(() => expect(api.sendChatMessage).toHaveBeenCalledWith(
      'document:d1', expect.objectContaining({ message: 'Make it fit one page', page: 'resume' }), expect.anything(),
    ));
  });

  it('takes the person to the feed when an answer\'s feed action is applied there', async () => {
    server.turns.g1 = [TURN];
    const { apply } = setup('settings');
    fireEvent.click(await screen.findByRole('button', { name: 'Show remote' }));
    expect(apply.setFilters).toHaveBeenCalledWith({ ...FILTERS, workModes: ['remote'] });
    expect(apply.setView).toHaveBeenCalledWith('postings');
  });

  it('takes the person to the feed when a job the answer named is clicked there, then opens it', async () => {
    server.turns.g1 = [TURN];
    const opened = vi.fn();
    const stop = onOpenPostingRequest(opened);
    const apply = { setFilters: vi.fn(), setSort: vi.fn(), setView: vi.fn() };
    const { rerender } = render(panel('profile', apply));
    fireEvent.click(await screen.findByRole('button', { name: /Frontend Intern/ }));
    expect(apply.setView).toHaveBeenCalledWith('postings');
    expect(opened).not.toHaveBeenCalled();
    rerender(panel('postings', apply));
    await waitFor(() => expect(opened).toHaveBeenCalledWith('p1'));
    stop();
  });
});
