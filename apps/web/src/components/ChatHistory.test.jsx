import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import AiChatPanel from './AiChatPanel.jsx';
import { announceOpenPosting, onOpenPostingRequest } from '../lib/openPostingSignal.js';
import { takeOpenRequest } from '../lib/openDocumentSignal.js';

vi.mock('../api.js', () => ({
  getProviders: vi.fn(),
  getProviderPreference: vi.fn(async () => ({ provider: 'auto' })),
  getChatPending: vi.fn(async () => ({ pending: null, failed: null })),
  getChatHistory: vi.fn(),
  sendChatMessage: vi.fn(),
  startNewConversation: vi.fn(),
  getPostingAiResults: vi.fn(async () => []),
  runPostingAction: vi.fn(),
  listConversations: vi.fn(),
  getConversation: vi.fn(),
  continueConversation: vi.fn(),
  deleteConversation: vi.fn(async () => null),
  getMadeByAi: vi.fn(),
  applyProposal: vi.fn(),
  discardProposal: vi.fn(),
}));

import {
  getProviders, getChatHistory, startNewConversation, listConversations, getConversation, continueConversation, deleteConversation, getMadeByAi,
} from '../api.js';

const CLAUDE = { id: 'claude', label: 'Claude Code', policies: ['none', 'web'], present: true, runs: true };
const FILTERS = { levels: [], workModes: [], q: '', minFit: '' };
const at = (day) => `2026-09-${day}T10:00:00.000Z`;
const OLD_TURN = {
  id: 't1', question: 'add my Go project', answer: 'Here is the project as a change you can apply.', provider: 'claude', createdAt: at(12),
  proposals: [{ id: 'p1', kind: 'profile', summary: 'Add the CLI tool', status: 'pending', diff: [{ label: 'Projects: add', before: '', after: 'CLI tool' }] }],
};
const FILED = [
  { id: 'c2', title: 'which are remote?', startedAt: at(14), endedAt: at(14), turnCount: 3 },
  { id: 'c1', title: 'add my Go project', startedAt: at(12), endedAt: at(12), turnCount: 1 },
];
const MADE = [
  { kind: 'cover-letter', at: at(20), postingId: 'j1', job: { title: 'Backend Engineer', company: 'Razorpay' }, versions: 2 },
  { kind: 'fake-check', at: at(19), postingId: 'gone', job: null, versions: 1 },
  { kind: 'document', at: at(18), documentId: 'd1', name: 'Resume for Razorpay', documentKind: 'resume', postingId: 'j1', job: { title: 'Backend Engineer', company: 'Razorpay' } },
  { kind: 'profile', at: at(12), summary: 'Add the CLI tool', conversationId: 'c1', current: false },
];

function setup(page = 'postings') {
  const apply = { setFilters: vi.fn(), setSort: vi.fn(), setView: vi.fn() };
  render(<AiChatPanel open onClose={() => {}} context={{ filters: FILTERS, sort: 'match', page }} apply={apply} />);
  return apply;
}

async function openHistory() {
  fireEvent.click(await screen.findByRole('button', { name: 'History' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  getProviders.mockResolvedValue([CLAUDE]);
  getChatHistory.mockResolvedValue({ id: 'c3', turns: [] });
  listConversations.mockResolvedValue(FILED);
  getConversation.mockResolvedValue({ ...FILED[1], turns: [OLD_TURN] });
  getMadeByAi.mockResolvedValue(MADE);
  announceOpenPosting(null);
});

describe('the chat\'s History: conversations', () => {
  it('lists the conversations filed away, newest first, and goes back to the chat', async () => {
    setup();
    await openHistory();
    expect(screen.getByRole('tab', { name: 'Conversations' })).toHaveAttribute('aria-selected', 'true');
    const rows = await screen.findAllByRole('button', { name: /questions?$/ });
    expect(rows.map((row) => row.textContent)).toEqual([expect.stringContaining('which are remote?'), expect.stringContaining('add my Go project')]);
    expect(rows[0]).toHaveTextContent('3 questions');
    expect(screen.queryByPlaceholderText('Ask about what is on screen')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to the chat' }));
    expect(await screen.findByPlaceholderText('Ask about what is on screen')).toBeInTheDocument();
  });

  it('opens one read-only, its changes still there to apply, and continues it as the current conversation', async () => {
    continueConversation.mockResolvedValue({ id: 'c1', turns: [OLD_TURN] });
    setup();
    await openHistory();
    fireEvent.click(await screen.findByRole('button', { name: /add my Go project/ }));
    expect(await screen.findByText('Here is the project as a change you can apply.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Profile change: Add the CLI tool' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled();
    expect(screen.queryByPlaceholderText('Ask about what is on screen')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue this conversation' }));
    await waitFor(() => expect(continueConversation).toHaveBeenCalledWith('c1'));
    expect(await screen.findByPlaceholderText('Ask about what is on screen')).toBeInTheDocument();
    expect(screen.getByText('add my Go project')).toBeInTheDocument();
  });

  it('deletes a conversation only after asking, and it leaves the list', async () => {
    setup();
    await openHistory();
    fireEvent.click(await screen.findByRole('button', { name: /add my Go project/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete this conversation' }));
    expect(deleteConversation).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('group', { name: 'Delete this conversation?' })).getByRole('button', { name: 'Delete it' }));
    await waitFor(() => expect(deleteConversation).toHaveBeenCalledWith('c1'));
    await screen.findByRole('button', { name: /which are remote\?/ });
    expect(screen.queryByRole('button', { name: /add my Go project/ })).not.toBeInTheDocument();
  });

  it('makes way for a new chat started from the header', async () => {
    startNewConversation.mockResolvedValue({ id: 'c4', turns: [], filed: null });
    setup();
    await openHistory();
    expect(screen.getByRole('button', { name: 'Close history' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'New chat' }));
    await waitFor(() => expect(startNewConversation).toHaveBeenCalled());
    expect(await screen.findByPlaceholderText('Ask about what is on screen')).toBeInTheDocument();
  });

  it('says so when nothing has been filed yet', async () => {
    listConversations.mockResolvedValue([]);
    setup();
    await openHistory();
    expect(await screen.findByText(/No past conversations yet/)).toBeInTheDocument();
  });
});

describe('the chat\'s History: made by AI', () => {
  async function openMade(page) {
    const apply = setup(page);
    await openHistory();
    fireEvent.click(screen.getByRole('tab', { name: 'Made by AI' }));
    await screen.findByText('Resume for Razorpay');
    return apply;
  }

  it('lists what the AI made, newest first, each naming its job or where it was made', async () => {
    await openMade();
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getAllByRole('listitem').map((row) => row.querySelector('p').textContent)).toEqual([
      'Cover letter', 'Is it real? check', 'Resume document', 'Profile change',
    ]);
    expect(within(panel).getByText('Razorpay, 2 versions', { exact: false })).toBeInTheDocument();
    expect(within(panel).getByText('A job JobDekho no longer lists')).toBeInTheDocument();
    expect(within(panel).getByText(/For Backend Engineer at Razorpay/)).toBeInTheDocument();
  });

  it('opens a job on the feed, or shows its answers in the chat even when the job is gone', async () => {
    const opened = vi.fn();
    const stop = onOpenPostingRequest(opened);
    await openMade();
    const [letter, check] = within(screen.getByRole('tabpanel')).getAllByRole('listitem');
    expect(within(check).queryByRole('button', { name: 'Open the job' })).not.toBeInTheDocument();
    fireEvent.click(within(letter).getByRole('button', { name: 'Open the job' }));
    stop();
    expect(opened).toHaveBeenCalledWith('j1');
    expect(await screen.findByPlaceholderText('Ask about what is on screen')).toBeInTheDocument();
    await openHistory();
    fireEvent.click(screen.getByRole('tab', { name: 'Made by AI' }));
    const again = await screen.findAllByRole('listitem');
    fireEvent.click(within(again[1]).getByRole('button', { name: 'Show in the chat' }));
    expect(await screen.findByText('Asking about')).toBeInTheDocument();
    expect(screen.getByText('A job JobDekho no longer lists')).toBeInTheDocument();
  });

  it('opens a document on the Resume page, and a profile change\'s conversation', async () => {
    const apply = await openMade('profile');
    const rows = within(screen.getByRole('tabpanel')).getAllByRole('listitem');
    fireEvent.click(within(rows[2]).getByRole('button', { name: 'Open it' }));
    expect(apply.setView).toHaveBeenCalledWith('resume');
    expect(takeOpenRequest()).toBe('d1');
    await openHistory();
    fireEvent.click(screen.getByRole('tab', { name: 'Made by AI' }));
    const again = await screen.findAllByRole('listitem');
    fireEvent.click(within(again[3]).getByRole('button', { name: 'See where it was made' }));
    await waitFor(() => expect(getConversation).toHaveBeenCalledWith('c1'));
    expect(await screen.findByRole('button', { name: 'Continue this conversation' })).toBeInTheDocument();
  });
});
