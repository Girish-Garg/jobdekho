import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import AiChatPanel from './AiChatPanel.jsx';
import AskAiButton from './AskAiButton.jsx';
import { announceOpenPosting } from '../lib/openPostingSignal.js';
import { onScreenId } from '../lib/activeChat.js';
import { chatStore } from '../lib/chatStore.js';
import { draftOf } from '../lib/chatDrafts.js';
import { onAskAboutPosting } from '../lib/askAiSignal.js';
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

const CLAUDE = { id: 'claude', label: 'Claude Code', policies: ['none', 'web'], present: true, runs: true };
const CHECK = {
  chatId: 'c-pA', kind: 'action', label: 'Is it real?', action: 'fake-check', postingId: 'pA',
  startedAt: '2026-10-03T11:00:00.000Z', provider: 'claude', stage: 'wait', web: false, text: '', title: 'Job A Engineer · AlphaCo',
};

let server;
const setup = () => render(<AiChatPanel open onClose={() => {}} context={{ filters: {}, sort: 'match', page: 'postings' }} apply={{}} />);
const box = () => screen.findByRole('textbox', { name: 'Ask about what is on screen' });

beforeEach(() => {
  vi.clearAllMocks();
  api.getProviders.mockResolvedValue([CLAUDE]);
  server = fakeChats(api, { chats: [generalChat('g1', 'hi'), jobChat('pA')], turns: { g1: [turn('hi', 'hello')] } });
  announceOpenPosting(null);
});

describe('one AI call at a time, across every chat', () => {
  it('holds Send back in every other chat with a note naming the busy chat and linking to it, while typing goes on', async () => {
    server.pending.busy = CHECK;
    setup();
    await screen.findByText('hello');
    const note = await screen.findByRole('status');
    expect(note).toHaveTextContent('Is it real? is running in AlphaCo\'s chat. You can send once it\'s done.');
    fireEvent.change(await box(), { target: { value: 'typed meanwhile' } });
    expect(screen.getByRole('button', { name: 'Ask' })).toBeDisabled();
    fireEvent.keyDown(await box(), { key: 'Enter' });
    expect(api.sendChatMessage).not.toHaveBeenCalled();
    expect(draftOf('g1')).toBe('typed meanwhile');
    fireEvent.click(within(note).getByRole('button', { name: 'AlphaCo\'s chat' }));
    expect(onScreenId()).toBe('c-pA');
    expect(await screen.findByRole('region', { name: 'Answer in progress' })).toBeInTheDocument();
  });

  it('keeps one follow-up waiting in the busy chat itself, shown until its answer is in, and takes it back on x', async () => {
    const first = held();
    api.sendChatMessage.mockImplementationOnce(async (id, body) => {
      await first.gate;
      return server.reply(id, turn(body.message, 'one'));
    });
    setup();
    fireEvent.change(await box(), { target: { value: 'first' } });
    fireEvent.keyDown(await box(), { key: 'Enter' });
    await screen.findByRole('region', { name: 'Answer in progress' });
    fireEvent.change(await box(), { target: { value: 'and the second?' } });
    fireEvent.keyDown(await box(), { key: 'Enter' });
    expect(await screen.findByText(/Sends once this answer is in/)).toHaveTextContent('and the second?');
    expect(api.queueChatMessage).toHaveBeenCalledWith('g1', expect.objectContaining({ message: 'and the second?' }));
    fireEvent.click(screen.getByRole('button', { name: 'Do not send it' }));
    await waitFor(() => expect(api.queueChatMessage).toHaveBeenLastCalledWith('g1', expect.objectContaining({ message: '' })));
    await waitFor(() => expect(screen.queryByText(/Sends once this answer is in/)).not.toBeInTheDocument());
    await act(async () => first.release());
  });

  it('stops the running answer in the chat it runs in', async () => {
    const first = held();
    api.sendChatMessage.mockImplementationOnce(() => first.gate);
    setup();
    fireEvent.change(await box(), { target: { value: 'compare them' } });
    fireEvent.keyDown(await box(), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('button', { name: 'Stop' }));
    await waitFor(() => expect(api.stopChat).toHaveBeenCalledWith('g1'));
    await act(async () => first.fail(Object.assign(new Error('You stopped it.'), { kind: 'stopped' })));
    expect(await screen.findByText(/You stopped it after/)).toBeInTheDocument();
  });
});

describe('the job pane\'s AI buttons', () => {
  it('are off while a call runs, with the reason as their tooltip, and a press is never kept for later', () => {
    const asked = vi.fn();
    const stop = onAskAboutPosting(asked);
    render(<AskAiButton posting={{ ...POSTINGS.pB, legitimacy: 'high' }} />);
    act(() => chatStore.set({ busy: { chatId: 'c-pA', kind: 'action', label: 'Is it real?', title: 'Job A Engineer · AlphaCo' } }));
    const letter = screen.getByRole('button', { name: 'Cover letter' });
    expect(letter).toBeDisabled();
    expect(letter).toHaveAttribute('title', 'Is it real? is running in AlphaCo\'s chat. You can send once it\'s done.');
    fireEvent.click(letter);
    expect(asked).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Ask AI about this job' })).toBeEnabled();
    act(() => chatStore.set({ busy: null }));
    fireEvent.click(screen.getByRole('button', { name: 'Cover letter' }));
    expect(asked).toHaveBeenCalledWith(expect.objectContaining({ action: 'cover-letter' }));
    stop();
  });

  // With only a tooltip to say so, the card looked the same busy or not.
  it('say outright in the card what runs and where, with a way to go and watch it', () => {
    render(<AskAiButton posting={{ ...POSTINGS.pB, legitimacy: 'high' }} />);
    expect(screen.queryByRole('status')).toBeNull();
    act(() => chatStore.set({ busy: { chatId: 'c-pA', kind: 'action', label: 'Is it real?', postingId: 'pA', title: 'Job A Engineer · AlphaCo' } }));
    expect(screen.getByRole('status')).toHaveTextContent("Is it real? is running in AlphaCo's chat. These wait until it's done.");
    fireEvent.click(within(screen.getByRole('status')).getByRole('button', { name: "AlphaCo's chat" }));
    expect(onScreenId()).toBe('c-pA');
    act(() => chatStore.set({ busy: null }));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('name a call about this very job as that', () => {
    render(<AskAiButton posting={{ ...POSTINGS.pA, legitimacy: 'high' }} />);
    act(() => chatStore.set({ busy: { chatId: 'job:pA', kind: 'action', label: 'Is it real?', postingId: 'pA', title: 'Job A Engineer · AlphaCo' } }));
    expect(screen.getByRole('status')).toHaveTextContent('Is it real? is running on this job.');
    fireEvent.click(within(screen.getByRole('status')).getByRole('button', { name: 'Watch it' }));
    expect(onScreenId()).toBe('job:pA');
    act(() => chatStore.set({ busy: null }));
  });
});
