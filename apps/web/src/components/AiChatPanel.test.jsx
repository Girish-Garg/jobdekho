import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import AiChatPanel from './AiChatPanel.jsx';
import { announceOpenPosting, onOpenPostingRequest } from '../lib/openPostingSignal.js';

vi.mock('../api.js', () => ({
  getProviders: vi.fn(),
  getChatHistory: vi.fn(),
  sendChatMessage: vi.fn(),
  clearChatHistory: vi.fn(async () => null),
  getPostingAiResults: vi.fn(async () => []),
  runPostingAction: vi.fn(),
}));

import { getProviders, getChatHistory, sendChatMessage, clearChatHistory, getPostingAiResults } from '../api.js';

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
      { message: 'which are remote?', filters: FILTERS, sort: 'match', openPostingId: null },
      { onEvent: expect.any(Function) },
    );
  });

  it('shows the question and its progress line while a call is in flight', async () => {
    let finish;
    sendChatMessage.mockImplementationOnce(async (_body, { onEvent }) => {
      onEvent({ event: 'start', provider: 'claude', path: 'x' });
      onEvent({ event: 'progress', stage: 'wait', elapsedMs: 5000 });
      await new Promise((r) => { finish = r; });
      return TURN;
    });
    setup();
    await ask('hi');
    await screen.findByText('Claude Code is thinking... 5s');
    expect(screen.getByText('hi')).toBeInTheDocument();
    await waitFor(() => finish());
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

  it('starts a new conversation, clearing the saved history and the transcript on screen', async () => {
    getChatHistory.mockResolvedValue({ turns: [TURN] });
    setup();
    await screen.findByText('Two of these are remote.');
    fireEvent.click(screen.getByRole('button', { name: 'New' }));
    await waitFor(() => expect(clearChatHistory).toHaveBeenCalled());
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
    await screen.findByText('The chat asks an AI CLI installed on this computer, on your own subscription.');
    expect(screen.queryByPlaceholderText('Ask about what is on screen')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://claude.ai/code' })).toBeInTheDocument();
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
