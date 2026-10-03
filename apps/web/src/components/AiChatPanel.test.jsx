import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import AiChatPanel from './AiChatPanel.jsx';
import { announceOpenPosting, onOpenPostingRequest } from '../lib/openPostingSignal.js';
import { fakeChats, generalChat, held, jobChat, turn, POSTINGS } from '../test/fixtures/chats.js';

vi.mock('../api.js', () => ({
  getProviders: vi.fn(),
  getProviderPreference: vi.fn(async () => ({ provider: 'auto' })),
  getChatPage: vi.fn(), listChats: vi.fn(), getChatsPending: vi.fn(), createChat: vi.fn(), markChatSeen: vi.fn(),
  clearChat: vi.fn(), deleteChat: vi.fn(), stopChat: vi.fn(), queueChatMessage: vi.fn(), changeChatItems: vi.fn(),
  sendChatMessage: vi.fn(), runPostingAction: vi.fn(), tailorForAll: vi.fn(), lettersForEach: vi.fn(),
  getPostingsPage: vi.fn(async () => ({ postings: [] })), listDocuments: vi.fn(async () => []),
}));

import * as api from '../api.js';

const CLAUDE = { id: 'claude', label: 'Claude Code', install: 'https://claude.ai/code', policies: ['none', 'web'], present: true, runs: true };
const FILTERS = { levels: [], workModes: [], q: '', minFit: '' };
const ANSWER = turn('which are remote?', 'Two of these are remote.', {
  actions: [{ type: 'filters', patch: { workModes: ['remote'] }, label: 'Show remote' }],
});

let server;
function setup(props = {}) {
  const apply = { setFilters: vi.fn(), setSort: vi.fn(), setView: vi.fn() };
  const onClose = vi.fn();
  const view = render(<AiChatPanel open onClose={onClose} context={{ filters: FILTERS, sort: 'match', page: 'postings' }} apply={apply} {...props} />);
  return { ...view, apply, onClose };
}
const panel = (open) => <AiChatPanel open={open} onClose={() => {}} context={{ filters: FILTERS, sort: 'match', page: 'postings' }} apply={{}} />;

async function ask(text) {
  const box = await screen.findByPlaceholderText('Ask about what is on screen');
  fireEvent.change(box, { target: { value: text } });
  fireEvent.keyDown(box, { key: 'Enter' });
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getProviders.mockResolvedValue([CLAUDE]);
  api.getProviderPreference.mockResolvedValue({ provider: 'auto' });
  server = fakeChats(api, { chats: [generalChat('g1', 'which are remote?')], turns: {} });
  announceOpenPosting(null);
});

describe('AiChatPanel, plain questions', () => {
  it('renders nothing when closed', () => {
    const { container } = render(panel(false));
    expect(container).toBeEmptyDOMElement();
  });

  it('opens on a fresh general chat about the feed when there is none yet, with no job actions', async () => {
    setup();
    await screen.findByText(/Ask about the postings on screen/);
    expect(api.createChat).toHaveBeenCalledWith({ kind: 'general' });
    expect(screen.queryByRole('group', { name: 'Actions for this job' })).not.toBeInTheDocument();
  });

  it('opens on the newest general chat, continued from where it was left', async () => {
    server.turns.g1 = [ANSWER];
    setup();
    expect(await screen.findByText('Two of these are remote.')).toBeInTheDocument();
    expect(api.createChat).not.toHaveBeenCalled();
  });

  it('sends a question to the chat on screen with the page, the filters and the sort', async () => {
    server.turns.g1 = [ANSWER];
    setup();
    await screen.findByText('Two of these are remote.');
    await ask('and which pay best?');
    await waitFor(() => expect(api.sendChatMessage).toHaveBeenCalledWith(
      'g1', { message: 'and which pay best?', page: 'postings', filters: FILTERS, sort: 'match' }, { onEvent: expect.any(Function) },
    ));
  });

  it('shows the question and a waiting card naming the CLI and its step while a call is in flight', async () => {
    const answer = held();
    api.sendChatMessage.mockImplementationOnce(async (id, body, { onEvent }) => {
      onEvent({ event: 'start', provider: 'claude', path: 'x' });
      onEvent({ event: 'progress', stage: 'send', chars: 10 });
      onEvent({ event: 'progress', stage: 'wait', elapsedMs: 5000 });
      await answer.gate;
      return server.reply(id, turn(body.message, 'Hello.'));
    });
    setup();
    await ask('hi');
    const card = await screen.findByRole('region', { name: 'Answer in progress' });
    expect(within(card).getByText('Claude Code, thinking')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('hi')).toBeInTheDocument();
    await act(async () => answer.release());
    expect(await screen.findByText('Hello.')).toBeInTheDocument();
  });

  it('shows the answer as it is written, and who is writing it', async () => {
    const answer = held();
    api.sendChatMessage.mockImplementationOnce(async (id, body, { onEvent }) => {
      onEvent({ event: 'start', provider: 'claude' });
      onEvent({ event: 'text', add: 'Two of these ' });
      onEvent({ event: 'text', add: 'are remote.' });
      await answer.gate;
      return server.reply(id, turn(body.message, 'Two of these are remote.'));
    });
    setup();
    await ask('hi');
    const card = await screen.findByRole('region', { name: 'Answer in progress' });
    expect(within(card).getByText('Two of these are remote.')).toBeInTheDocument();
    expect(within(card).getByText('Claude Code is writing')).toBeInTheDocument();
    await act(async () => answer.release());
  });

  it('keeps the question in flight across closing and opening the panel, and shows the answer that landed meanwhile', async () => {
    server.turns.g1 = [ANSWER];
    const answer = held();
    api.sendChatMessage.mockImplementationOnce(async (id, body, { onEvent }) => {
      onEvent({ event: 'start', provider: 'claude' });
      await answer.gate;
      return server.reply(id, turn(body.message, 'The third is hybrid.'));
    });
    const { rerender } = render(panel(true));
    await screen.findByText('Two of these are remote.');
    await ask('and the third?');
    await screen.findByRole('region', { name: 'Answer in progress' });
    rerender(panel(false));
    rerender(panel(true));
    expect(await screen.findByRole('region', { name: 'Answer in progress' })).toBeInTheDocument();
    expect(screen.getByText('and the third?')).toBeInTheDocument();
    rerender(panel(false));
    await act(async () => answer.release());
    rerender(panel(true));
    expect(await screen.findByText('The third is hybrid.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Answer in progress' })).not.toBeInTheDocument();
  });

  it('offers the actions a turn came back with, and applies a filter or a sort on click', async () => {
    server.turns.g1 = [ANSWER, turn('sort these', 'Sorted.', { actions: [{ type: 'sort', value: 'newest', label: 'Sort by newest first' }] })];
    const { apply } = setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Show remote' }));
    expect(apply.setFilters).toHaveBeenCalledWith({ ...FILTERS, workModes: ['remote'] });
    fireEvent.click(screen.getByRole('button', { name: 'Sort by newest first' }));
    expect(apply.setSort).toHaveBeenCalledWith('newest');
  });

  it('starts a new general chat, leaving the one on screen where it is', async () => {
    server.turns.g1 = [ANSWER];
    setup();
    await screen.findByText('Two of these are remote.');
    fireEvent.click(screen.getByRole('button', { name: 'New chat' }));
    await screen.findByText(/Ask about the postings on screen/);
    expect(api.createChat).toHaveBeenCalledWith({ kind: 'general' });
    expect(screen.queryByText('Two of these are remote.')).not.toBeInTheDocument();
  });

  it('closes on request', async () => {
    const { onClose } = setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Close the chat' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps a question that got no answer in its chat, with the CLI\'s own sentence and a recheck', async () => {
    api.sendChatMessage.mockRejectedValueOnce(Object.assign(new Error('Claude Code is not installed'), { kind: 'not_found' }));
    setup();
    await ask('hi');
    expect(await screen.findByRole('alert')).toHaveTextContent('Claude Code is not installed');
    fireEvent.click(screen.getByRole('button', { name: 'Check again' }));
    await waitFor(() => expect(api.getProviders).toHaveBeenCalledWith({ refresh: true }));
  });

  it('stands one install hint in for the whole panel when no CLI can answer anything', async () => {
    api.getProviders.mockResolvedValue([{ ...CLAUDE, present: false, runs: false }]);
    setup();
    await screen.findByText('The chat asks an AI CLI installed on this computer, on your own subscription or a local model.');
    expect(screen.queryByPlaceholderText('Ask about what is on screen')).not.toBeInTheDocument();
  });
});

describe('AiChatPanel, the redesigned panel', () => {
  it('names the CLI that will answer, honouring the preferred one', async () => {
    api.getProviders.mockResolvedValue([CLAUDE, { ...CLAUDE, id: 'agy', label: 'Antigravity' }]);
    api.getProviderPreference.mockResolvedValue({ provider: 'agy' });
    setup();
    expect(await screen.findByText('Antigravity on this PC')).toBeInTheDocument();
  });

  it('sends a suggested question on click, and shows it as the person\'s own words', async () => {
    server.answers['Which of these fit me best?'] = 'These two.';
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Which of these fit me best?' }));
    await screen.findByText('These two.');
    expect(screen.getByText('Which of these fit me best?')).toBeInTheDocument();
  });

  it('says the web gets the question only while it searches', async () => {
    const answer = held();
    api.sendChatMessage.mockImplementationOnce(async (id, body, { onEvent }) => {
      onEvent({ event: 'start', provider: 'claude' });
      onEvent({ event: 'progress', stage: 'web' });
      await answer.gate;
      return server.reply(id, turn(body.message, 'Acme raised a Series B.'));
    });
    setup();
    await ask('is Acme funded?');
    expect(await screen.findByText('Checking the web with your question only, not your profile')).toHaveAttribute('aria-live', 'polite');
    await act(async () => answer.release());
  });

  it('draws a saved turn that also searched the web as the answer, then the web card', async () => {
    server.turns.g1 = [{ ...ANSWER, web: { answer: 'Acme raised a Series B.', sources: ['https://acme.example'], provider: 'claude' } }];
    setup();
    expect(await screen.findByRole('region', { name: 'From the web' })).toHaveTextContent('Acme raised a Series B.');
  });

  it('lists the jobs an answer names, and opens the one clicked in the pane', async () => {
    server.turns.g1 = [{ ...ANSWER, refs: [{ id: 'p2', title: 'Backend Engineer', company: 'Globex', fit: null }] }];
    const opened = vi.fn();
    const stop = onOpenPostingRequest(opened);
    setup();
    fireEvent.click(await screen.findByRole('button', { name: /Backend Engineer/ }));
    expect(opened).toHaveBeenCalledWith('p2');
    stop();
  });
});

describe('AiChatPanel, a job\'s own chat', () => {
  it('shows the chat of the job open in the pane, empty until its first question, which goes to it', async () => {
    announceOpenPosting(POSTINGS.p9);
    setup();
    expect(await screen.findByText('Initech · this job\'s chat')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ask about this job' })).toBeInTheDocument();
    await ask('am I qualified?');
    await waitFor(() => expect(api.sendChatMessage).toHaveBeenCalledWith('job:p9', expect.objectContaining({ message: 'am I qualified?' }), expect.anything()));
  });

  it('follows the pane from job to job, and goes back to the chat before when the pane closes', async () => {
    server.turns.g1 = [ANSWER];
    setup();
    await screen.findByText('Two of these are remote.');
    act(() => announceOpenPosting(POSTINGS.pA));
    expect(await screen.findByText('AlphaCo · this job\'s chat')).toBeInTheDocument();
    act(() => announceOpenPosting(POSTINGS.pB));
    expect(await screen.findByText('BetaCo · this job\'s chat')).toBeInTheDocument();
    act(() => announceOpenPosting(null));
    expect(await screen.findByText('Two of these are remote.')).toBeInTheDocument();
  });

  it('stays put with the pin on, and offers the open job\'s chat instead', async () => {
    server.turns.g1 = [ANSWER];
    setup();
    await screen.findByText('Two of these are remote.');
    fireEvent.click(screen.getByRole('button', { name: 'Keep this chat on screen' }));
    act(() => announceOpenPosting(POSTINGS.pA));
    fireEvent.click(await screen.findByRole('button', { name: 'Open AlphaCo\'s chat' }));
    expect(await screen.findByText('AlphaCo · this job\'s chat')).toBeInTheDocument();
  });

  it('opens on the chat of the job the pane asked about, even with another open', async () => {
    server.chats.push(jobChat('p9'));
    announceOpenPosting(POSTINGS.pA);
    setup({ request: { id: 10_000, posting: POSTINGS.p9, action: null } });
    expect(await screen.findByText('Initech · this job\'s chat')).toBeInTheDocument();
  });
});
