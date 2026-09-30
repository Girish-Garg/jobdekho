import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import AiChatPanel from './AiChatPanel.jsx';
import { announceOpenPosting, onOpenPostingRequest } from '../lib/openPostingSignal.js';

vi.mock('../api.js', () => ({
  getProviders: vi.fn(),
  getProviderPreference: vi.fn(async () => ({ provider: 'auto' })),
  getChatPending: vi.fn(async () => ({ pending: null, failed: null })),
  getChatHistory: vi.fn(),
  sendChatMessage: vi.fn(),
  startNewConversation: vi.fn(async () => ({ id: 'c-new', turns: [], filed: null })),
  getPostingAiResults: vi.fn(async () => []),
  runPostingAction: vi.fn(),
}));

import { getProviders, getProviderPreference, getChatHistory, sendChatMessage, startNewConversation, getPostingAiResults } from '../api.js';

const CLAUDE = { id: 'claude', label: 'Claude Code', install: 'https://claude.ai/code', policies: ['none', 'web'], present: true, runs: true };
const FILTERS = { levels: [], workModes: [], q: '', minFit: '' };
const JOB = { id: 'p9', title: 'Staff Engineer', company: 'Initech', legitimacy: 'high' };
const TURN = {
  question: 'which are remote?', answer: 'Two of these are remote.',
  actions: [{ type: 'filters', patch: { workModes: ['remote'] }, label: 'Show remote' }],
  refs: [], provider: 'claude', createdAt: '2026-09-29T10:00:00.000Z',
};

function setup(props = {}) {
  const apply = { setFilters: vi.fn(), setSort: vi.fn() };
  const onClose = vi.fn();
  const view = render(<AiChatPanel open onClose={onClose} context={{ filters: FILTERS, sort: 'match' }} apply={apply} {...props} />);
  return { ...view, apply, onClose };
}

async function ask(text) {
  const box = await screen.findByPlaceholderText('Ask about what is on screen');
  fireEvent.change(box, { target: { value: text } });
  fireEvent.keyDown(box, { key: 'Enter' });
}

beforeEach(() => {
  vi.clearAllMocks();
  getProviders.mockResolvedValue([CLAUDE]);
  getProviderPreference.mockResolvedValue({ provider: 'auto' });
  getChatHistory.mockResolvedValue({ turns: [] });
  getPostingAiResults.mockResolvedValue([]);
  sendChatMessage.mockResolvedValue(TURN);
  announceOpenPosting(null);
});

describe('AiChatPanel, plain questions', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<AiChatPanel open={false} onClose={() => {}} context={{ filters: FILTERS, sort: 'match' }} apply={{}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('invites a question about the feed before anything has been asked, with no job actions', async () => {
    setup();
    await screen.findByText(/Ask about the postings on screen/);
    expect(screen.queryByRole('group', { name: 'Actions for this job' })).not.toBeInTheDocument();
  });

  it('sends an unscoped question with the filters and sort, and no posting', async () => {
    setup();
    await ask('which are remote?');
    await screen.findByText('Two of these are remote.');
    expect(sendChatMessage).toHaveBeenCalledWith(
      { message: 'which are remote?', filters: FILTERS, sort: 'match', openPostingId: null, page: 'postings' },
      { onEvent: expect.any(Function) },
    );
  });

  it('shows the question and a waiting card naming the CLI and its step while a call is in flight', async () => {
    let finish;
    sendChatMessage.mockImplementationOnce(async (_body, { onEvent }) => {
      onEvent({ event: 'start', provider: 'claude', path: 'x' });
      onEvent({ event: 'progress', stage: 'send', chars: 10 });
      onEvent({ event: 'progress', stage: 'wait', elapsedMs: 5000 });
      await new Promise((r) => { finish = r; });
      return TURN;
    });
    setup();
    await ask('hi');
    const card = await screen.findByRole('region', { name: 'Answer in progress' });
    expect(within(card).getByText('Claude Code')).toBeInTheDocument();
    expect(within(card).getByText('Thinking...')).toHaveAttribute('aria-live', 'polite');
    const steps = within(within(card).getByRole('list', { name: 'Progress' })).getAllByRole('listitem');
    expect(steps.map((step) => step.textContent)).toEqual(['Sent to Claude Code (done)', 'Thinking', 'Writing it up']);
    expect(steps[1]).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('hi')).toBeInTheDocument();
    await waitFor(() => finish());
  });

  // The answer used to be thrown away with the panel: the call was held in
  // the panel's own state, so closing it mid-answer lost the question and
  // the answer, though the server still saved the turn.
  it('keeps the question in flight across closing and opening the panel, and shows the answer that landed meanwhile', async () => {
    let finish;
    sendChatMessage.mockImplementationOnce(async (_body, { onEvent }) => {
      onEvent({ event: 'start', provider: 'claude' });
      await new Promise((r) => { finish = r; });
      return TURN;
    });
    const { rerender } = setup();
    await ask('which are remote?');
    await screen.findByRole('region', { name: 'Answer in progress' });
    const closed = <AiChatPanel open={false} onClose={() => {}} context={{ filters: FILTERS, sort: 'match' }} apply={{}} />;
    const opened = <AiChatPanel open onClose={() => {}} context={{ filters: FILTERS, sort: 'match' }} apply={{}} />;
    rerender(closed);
    rerender(opened);
    expect(await screen.findByRole('region', { name: 'Answer in progress' })).toBeInTheDocument();
    expect(screen.getByText('which are remote?')).toBeInTheDocument();
    rerender(closed);
    await act(async () => finish());
    rerender(opened);
    expect(await screen.findByText('Two of these are remote.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Answer in progress' })).not.toBeInTheDocument();
    expect(getChatHistory).toHaveBeenCalledTimes(1);
  });

  it('offers the actions a turn came back with, and applies one on click', async () => {
    const { apply } = setup();
    await ask('which are remote?');
    fireEvent.click(await screen.findByRole('button', { name: 'Show remote' }));
    expect(apply.setFilters).toHaveBeenCalledWith({ ...FILTERS, workModes: ['remote'] });
    expect(apply.setSort).not.toHaveBeenCalled();
  });

  it('applies a sort action through setSort, not setFilters', async () => {
    sendChatMessage.mockResolvedValueOnce({ ...TURN, actions: [{ type: 'sort', value: 'newest', label: 'Sort by newest first' }] });
    const { apply } = setup();
    await ask('sort these');
    fireEvent.click(await screen.findByRole('button', { name: 'Sort by newest first' }));
    expect(apply.setSort).toHaveBeenCalledWith('newest');
    expect(apply.setFilters).not.toHaveBeenCalled();
  });

  it('starts a new conversation, filing the old one away and clearing the transcript on screen', async () => {
    getChatHistory.mockResolvedValue({ turns: [TURN] });
    setup();
    await screen.findByText('Two of these are remote.');
    fireEvent.click(screen.getByRole('button', { name: 'New chat' }));
    await waitFor(() => expect(startNewConversation).toHaveBeenCalled());
    await screen.findByText(/Ask about the postings on screen/);
  });

  it('closes on request', async () => {
    const { onClose } = setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Close the chat' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows the CLI\'s own sentence, with a recheck, when the call cannot be answered', async () => {
    sendChatMessage.mockRejectedValueOnce(Object.assign(new Error('Claude Code is not installed'), { kind: 'not_found' }));
    setup();
    await ask('hi');
    await screen.findByText('Claude Code is not installed');
    fireEvent.click(screen.getByRole('button', { name: 'Check again' }));
    await waitFor(() => expect(getProviders).toHaveBeenCalledWith({ refresh: true }));
  });

  it('stands one install hint in for the whole panel when no CLI can answer anything', async () => {
    getProviders.mockResolvedValue([{ ...CLAUDE, present: false, runs: false }]);
    setup();
    await screen.findByText('The chat asks an AI CLI installed on this computer, on your own subscription or a local model.');
    expect(screen.queryByPlaceholderText('Ask about what is on screen')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://claude.ai/code' })).toBeInTheDocument();
  });
});

describe('AiChatPanel, the redesigned panel', () => {
  const AGY = { ...CLAUDE, id: 'agy', label: 'Antigravity', install: 'https://antigravity.google' };

  it('names the CLI that will answer, honouring the preferred one', async () => {
    getProviders.mockResolvedValue([CLAUDE, AGY]);
    getProviderPreference.mockResolvedValue({ provider: 'agy' });
    setup();
    expect(await screen.findByText('Antigravity on this computer')).toBeInTheDocument();
  });

  it('sends a suggested question on click, and shows it as the person\'s own words', async () => {
    sendChatMessage.mockResolvedValueOnce({ ...TURN, question: 'Which of these fit me best?' });
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Which of these fit me best?' }));
    await waitFor(() => expect(sendChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Which of these fit me best?', page: 'postings' }),
      { onEvent: expect.any(Function) },
    ));
    await screen.findByText('Two of these are remote.');
    expect(screen.getByText('Which of these fit me best?')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Suggested questions' })).not.toBeInTheDocument();
  });

  it('shows the question at once, then the waiting card, saying the web gets the question only, until the answer lands', async () => {
    let finish;
    sendChatMessage.mockImplementationOnce(async (_body, { onEvent }) => {
      onEvent({ event: 'start', provider: 'claude' });
      onEvent({ event: 'progress', stage: 'web' });
      await new Promise((r) => { finish = r; });
      return TURN;
    });
    setup();
    await ask('is Acme funded?');
    expect(await screen.findByText('Checking the web with your question only, not your profile...')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('is Acme funded?')).toBeInTheDocument();
    await waitFor(() => finish());
    await screen.findByText('Two of these are remote.');
    expect(screen.queryByRole('region', { name: 'Answer in progress' })).not.toBeInTheDocument();
  });

  it('draws a saved turn that also searched the web as the answer, then the web card', async () => {
    getChatHistory.mockResolvedValue({ turns: [{ ...TURN, web: { answer: 'Acme raised a Series B.', sources: ['https://acme.example'], provider: 'claude' } }] });
    setup();
    const card = await screen.findByRole('region', { name: 'From the web' });
    expect(card).toHaveTextContent('Acme raised a Series B.');
    expect(screen.getByText('Two of these are remote.')).toBeInTheDocument();
  });
});

describe('AiChatPanel, the jobs an answer names', () => {
  const REFS = [
    { id: 'p1', title: 'Frontend Intern', company: 'Acme', fit: 55 },
    { id: 'p2', title: 'Backend Engineer', company: 'Globex', fit: null },
  ];

  it('lists them under the answer, and opens the one clicked in the pane', async () => {
    sendChatMessage.mockResolvedValueOnce({ ...TURN, refs: REFS });
    const opened = vi.fn();
    const stop = onOpenPostingRequest(opened);
    setup();
    await ask('which fit me?');
    const list = await screen.findByRole('list', { name: 'Jobs in this answer' });
    expect(list).toHaveTextContent('Frontend Intern');
    expect(list).toHaveTextContent('Acme');
    expect(list).toHaveTextContent('fit 55');
    fireEvent.click(screen.getByRole('button', { name: /Backend Engineer/ }));
    expect(opened).toHaveBeenCalledWith('p2');
    stop();
  });

  it('shows no list for an answer that named no job, or one saved before refs existed', async () => {
    const { refs, ...old } = TURN;
    getChatHistory.mockResolvedValue({ turns: [old] });
    setup();
    await screen.findByText('Two of these are remote.');
    expect(screen.queryByRole('list', { name: 'Jobs in this answer' })).not.toBeInTheDocument();
  });
});

describe('AiChatPanel, scoped to a job', () => {
  it('names the job already open in the pane and sends questions about it', async () => {
    announceOpenPosting(JOB);
    setup();
    expect(await screen.findByText('Staff Engineer')).toBeInTheDocument();
    expect(screen.getByText('Initech')).toBeInTheDocument();
    await waitFor(() => expect(getPostingAiResults).toHaveBeenCalledWith('p9'));
    await ask('am I qualified?');
    await waitFor(() => expect(sendChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'am I qualified?', openPostingId: 'p9' }),
      { onEvent: expect.any(Function) },
    ));
  });

  it('follows the job opened in the pane, and keeps it when the pane closes', async () => {
    setup();
    await screen.findByText(/Ask about the postings on screen/);
    act(() => announceOpenPosting(JOB));
    expect(await screen.findByText('Staff Engineer')).toBeInTheDocument();
    act(() => announceOpenPosting({ id: 'p4', title: 'Data Analyst', company: 'Hooli' }));
    expect(await screen.findByText('Data Analyst')).toBeInTheDocument();
    expect(screen.queryByText('Staff Engineer')).not.toBeInTheDocument();
    act(() => announceOpenPosting(null));
    expect(screen.getByText('Data Analyst')).toBeInTheDocument();
  });

  it('goes back to questions about the feed when the scope is cleared', async () => {
    announceOpenPosting(JOB);
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Stop asking about this job' }));
    expect(screen.queryByText('Staff Engineer')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Actions for this job' })).not.toBeInTheDocument();
    await ask('anything remote?');
    await waitFor(() => expect(sendChatMessage).toHaveBeenCalledWith(expect.objectContaining({ openPostingId: null }), expect.anything()));
  });

  it('scopes to the job the pane asked about, even with another open', async () => {
    announceOpenPosting({ id: 'p4', title: 'Data Analyst', company: 'Hooli' });
    const request = { id: 10_000, posting: JOB, action: null };
    setup({ request });
    expect(await screen.findByText('Staff Engineer')).toBeInTheDocument();
    expect(screen.queryByText('Data Analyst')).not.toBeInTheDocument();
  });
});
