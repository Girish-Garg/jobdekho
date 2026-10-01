import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import ApplyAssistant from './ApplyAssistant.jsx';
import { useApplyChat } from '../lib/useApplyChat.js';
import * as api from '../api/apply.js';

vi.mock('../api/apply.js', () => ({
  askApply: vi.fn(), stopApplyAsk: vi.fn(async () => ({ stopped: true })),
  getApplyCopy: vi.fn(async () => ({ rows: [], coverLetter: '', hasResume: false })), APPLY_RESUME_URL: '/r', applyFileUrl: () => '/f',
}));

const view = (over = {}) => ({ state: 'review', rows: [], url: 'https://jobs.lever.co/acme/1', title: 'Acme', ...over });
const chat = (over = {}) => ({ messages: [], pending: null, ask: vi.fn(), stop: vi.fn(), ...over });

beforeEach(() => vi.clearAllMocks());

const assistant = (props) => render(<ApplyAssistant view={view()} chat={chat()} onHover={() => {}} onTakeOver={() => {}} copy={{ open: false, close: () => {}, postingId: 'p1' }} {...props} />);

describe('ApplyAssistant', () => {
  it('counts the page, and drafts from the resume in one press', () => {
    const c = chat();
    assistant({ view: view({ rows: [{ fid: 'f1', label: 'Notice period', status: 'you', askable: true }, { fid: 'f2', label: 'Email', status: 'filled' }] }), chat: c });
    expect(screen.getByRole('complementary', { name: 'Assistant' })).toHaveTextContent('1 answered · 1 need you');
    fireEvent.click(screen.getByRole('button', { name: 'Draft from my resume' }));
    expect(c.ask).toHaveBeenCalledWith(expect.stringMatching(/^Draft answers/));
  });

  // A question that needs the person starts their reply in the box.
  it('starts a reply for a question it can help with', () => {
    assistant({ view: view({ rows: [{ fid: 'f1', label: 'Notice period', status: 'you', askable: true, note: 'JobDekho does not know this one.' }] }) });
    fireEvent.click(screen.getByRole('button', { name: /Notice period tell me/ }));
    expect(screen.getByPlaceholderText('Tell it what to put...')).toHaveValue('For "Notice period": ');
  });

  it('shows what the AI set under its answer, a refusal plainly', () => {
    const messages = [
      { role: 'you', text: 'Put 30 days, and my Aadhaar' },
      { role: 'ai', text: 'Set the notice period. Your Aadhaar is yours to type.', filled: [{ label: 'Notice period', result: 'filled' }, { label: 'Gender', result: 'refused' }] },
    ];
    assistant({ chat: chat({ messages }) });
    expect(screen.getByText('Put 30 days, and my Aadhaar')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'What it set' })).toHaveTextContent('Notice period: set');
    expect(screen.getByRole('list', { name: 'What it set' })).toHaveTextContent('Gender: yours to answer');
  });

  // The wheel stays the person's: Stop while it thinks, Take control while it fills.
  it('stops a message being answered, and hands the wheel back while JobDekho fills', () => {
    const c = chat({ pending: { text: 'Set the not', provider: 'claude', startedAt: Date.now() } });
    const { unmount } = assistant({ chat: c });
    expect(screen.getByText('Set the not')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(c.stop).toHaveBeenCalled();
    unmount();
    const onTakeOver = vi.fn();
    assistant({ view: view({ state: 'filling' }), onTakeOver });
    fireEvent.click(screen.getByRole('button', { name: 'Take control' }));
    expect(onTakeOver).toHaveBeenCalled();
  });
});

describe('useApplyChat', () => {
  it('streams the answer in, then keeps it with what was set', async () => {
    let finish;
    api.askApply.mockImplementationOnce(async (_id, _text, onEvent) => {
      onEvent({ event: 'start', provider: 'claude' });
      onEvent({ event: 'text', add: 'Set it' });
      await new Promise((resolve) => { finish = resolve; });
      return { reply: 'Set it.', filled: [{ label: 'Notice period', result: 'filled' }] };
    });
    const { result } = renderHook(() => useApplyChat('s1'));
    act(() => { result.current.ask('30 days notice'); });
    await waitFor(() => expect(result.current.pending?.text).toBe('Set it'));
    await act(async () => finish());
    expect(api.askApply).toHaveBeenCalledWith('s1', '30 days notice', expect.any(Function));
    expect(result.current.pending).toBeNull();
    expect(result.current.messages).toEqual([
      { role: 'you', text: '30 days notice' },
      { role: 'ai', text: 'Set it.', filled: [{ label: 'Notice period', result: 'filled' }] },
    ]);
  });

  it('says a stop plainly, and a failure in the server\'s words', async () => {
    api.askApply
      .mockRejectedValueOnce(Object.assign(new Error('stopped'), { kind: 'stopped' }))
      .mockRejectedValueOnce(new Error('Claude Code did not answer within 180 seconds.'));
    const { result } = renderHook(() => useApplyChat('s1'));
    await act(async () => { await result.current.ask('one'); });
    await act(async () => { await result.current.ask('two'); });
    expect(result.current.messages.filter((m) => m.role !== 'you')).toEqual([
      { role: 'note', text: 'You stopped it.' },
      { role: 'error', text: 'Claude Code did not answer within 180 seconds.' },
    ]);
  });
});
