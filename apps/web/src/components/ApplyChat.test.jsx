import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import ApplyChat from './ApplyChat.jsx';
import { useApplyChat } from '../lib/useApplyChat.js';
import * as api from '../api/apply.js';

vi.mock('../api/apply.js', () => ({ askApply: vi.fn(), stopApplyAsk: vi.fn(async () => ({ stopped: true })) }));

const view = (over = {}) => ({ state: 'review', rows: [], ...over });
const chat = (over = {}) => ({ messages: [], pending: null, ask: vi.fn(), stop: vi.fn(), ...over });

beforeEach(() => vi.clearAllMocks());

describe('ApplyChat', () => {
  // A question it cannot answer alone is put to the person, not guessed.
  it('says first which questions on the page need the person, and offers to draft from the resume', () => {
    const c = chat();
    render(<ApplyChat view={view({ rows: [{ label: 'Notice period', status: 'you' }, { label: 'Email', status: 'filled' }, { label: 'Why Acme?', status: 'you' }] })} chat={c} />);
    expect(screen.getByText(/2 questions here need you/)).toBeInTheDocument();
    expect(screen.getByText(/Notice period, Why Acme\?/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Draft from my resume' }));
    expect(c.ask).toHaveBeenCalledWith(expect.stringMatching(/^Draft answers/));
  });

  it('shows what the AI set under its answer, a refusal plainly', () => {
    const messages = [
      { role: 'you', text: 'Put 30 days, and my Aadhaar' },
      { role: 'ai', text: 'Set the notice period. Your Aadhaar is yours to type.', filled: [{ label: 'Notice period', result: 'filled' }, { label: 'Gender', result: 'refused' }] },
    ];
    render(<ApplyChat view={view()} chat={chat({ messages })} />);
    expect(screen.getByText('Put 30 days, and my Aadhaar')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'What it set' })).toHaveTextContent('Notice period: set');
    expect(screen.getByRole('list', { name: 'What it set' })).toHaveTextContent('Gender: yours to answer');
  });

  // The wheel stays the person's: Stop while it thinks, Take over while it fills.
  it('stops a message being answered, and hands the wheel back while JobDekho fills', () => {
    const c = chat({ pending: { text: 'Set the not', provider: 'claude', startedAt: Date.now() } });
    const { unmount } = render(<ApplyChat view={view()} chat={c} />);
    expect(screen.getByText('Set the not')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(c.stop).toHaveBeenCalled();
    unmount();
    const onTakeOver = vi.fn();
    render(<ApplyChat view={view({ state: 'filling' })} chat={chat()} onTakeOver={onTakeOver} />);
    fireEvent.click(screen.getByRole('button', { name: 'Take over' }));
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
