import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AiChatPanel from './AiChatPanel.jsx';
import { announceOpenPosting } from '../lib/openPostingSignal.js';

vi.mock('../api.js', () => ({
  getProviders: vi.fn(async () => [{ id: 'claude', label: 'Claude Code', present: true, runs: true }]),
  getChatHistory: vi.fn(async () => ({ turns: [] })),
  sendChatMessage: vi.fn(),
  clearChatHistory: vi.fn(async () => null),
}));

import { getProviders, getChatHistory, sendChatMessage, clearChatHistory } from '../api.js';

const FILTERS = { levels: [], workModes: [], q: '', minFit: '' };
const TURN = {
  question: 'which are remote?', answer: 'Two of these are remote.',
  actions: [{ type: 'filters', patch: { workModes: ['remote'] }, label: 'Show remote' }],
  provider: 'claude', createdAt: 'x',
};

function setup(props = {}) {
  const apply = { setFilters: vi.fn(), setSort: vi.fn() };
  const onClose = vi.fn();
  const view = render(
    <AiChatPanel
      open
      onClose={onClose}
      context={{ filters: FILTERS, sort: 'match' }}
      apply={apply}
      {...props}
    />,
  );
  return { ...view, apply, onClose };
}

beforeEach(() => {
  vi.clearAllMocks();
  getProviders.mockResolvedValue([{ id: 'claude', label: 'Claude Code', present: true, runs: true }]);
  getChatHistory.mockResolvedValue({ turns: [] });
  sendChatMessage.mockResolvedValue(TURN);
  announceOpenPosting(null);
});

describe('AiChatPanel', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<AiChatPanel open={false} onClose={() => {}} context={{ filters: FILTERS, sort: 'match' }} apply={{}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('invites a question before anything has been asked', async () => {
    setup();
    await screen.findByText(/Ask about the postings on screen/);
  });

  it('sends a turn with the current filters, sort and open posting, and shows the answer', async () => {
    announceOpenPosting('p9');
    setup();
    const box = await screen.findByPlaceholderText('Ask about what is on screen');
    fireEvent.change(box, { target: { value: 'which are remote?' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    await screen.findByText('Two of these are remote.');
    expect(sendChatMessage).toHaveBeenCalledWith(
      { message: 'which are remote?', filters: FILTERS, sort: 'match', openPostingId: 'p9' },
      { onEvent: expect.any(Function) },
    );
  });

  it('shows the progress line while a call is in flight', async () => {
    let finish;
    sendChatMessage.mockImplementationOnce(async (_body, { onEvent }) => {
      onEvent({ event: 'start', provider: 'claude', path: 'x' });
      onEvent({ event: 'progress', stage: 'wait', elapsedMs: 5000 });
      await new Promise((r) => { finish = r; });
      return TURN;
    });
    setup();
    const box = await screen.findByPlaceholderText('Ask about what is on screen');
    fireEvent.change(box, { target: { value: 'hi' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    await screen.findByText('Claude Code is thinking... 5s');
    await waitFor(() => finish());
  });

  it('offers the actions a turn came back with, and applies one on click', async () => {
    const { apply } = setup();
    const box = await screen.findByPlaceholderText('Ask about what is on screen');
    fireEvent.change(box, { target: { value: 'which are remote?' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    const button = await screen.findByRole('button', { name: 'Show remote' });
    fireEvent.click(button);
    expect(apply.setFilters).toHaveBeenCalledWith({ ...FILTERS, workModes: ['remote'] });
    expect(apply.setSort).not.toHaveBeenCalled();
  });

  it('applies a sort action through setSort, not setFilters', async () => {
    sendChatMessage.mockResolvedValueOnce({ ...TURN, actions: [{ type: 'sort', value: 'newest', label: 'Sort by newest first' }] });
    const { apply } = setup();
    const box = await screen.findByPlaceholderText('Ask about what is on screen');
    fireEvent.change(box, { target: { value: 'sort these' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    const button = await screen.findByRole('button', { name: 'Sort by newest first' });
    fireEvent.click(button);
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
    const box = await screen.findByPlaceholderText('Ask about what is on screen');
    fireEvent.change(box, { target: { value: 'hi' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    await screen.findByText('Claude Code is not installed');
    fireEvent.click(screen.getByRole('button', { name: 'Check again' }));
    await waitFor(() => expect(getProviders).toHaveBeenCalledWith({ refresh: true }));
  });
});
