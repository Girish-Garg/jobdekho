import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatQueue } from './useChatQueue.js';

const chat = (over = {}) => ({ missed: null, ask: vi.fn(), stop: vi.fn(), forget: vi.fn(), ...over });
const cli = { refresh: vi.fn(), checking: false };

describe('useChatQueue', () => {
  it('holds a question written during an answer and sends it once the answer is in', () => {
    const onSend = vi.fn();
    const { result, rerender } = renderHook(({ runner }) => useChatQueue({ chat: chat(), runner, cli, onSend }), {
      initialProps: { runner: { busy: true, call: { what: { ask: true } } } },
    });
    act(() => result.current.box.onQueue('and the third?'));
    expect(result.current.box.queued).toBe('and the third?');
    expect(onSend).not.toHaveBeenCalled();
    rerender({ runner: { busy: false, call: null } });
    expect(onSend).toHaveBeenCalledWith('and the third?');
    expect(result.current.box.queued).toBeNull();
  });

  // The server can stop a question, not a quick action.
  it('offers Stop for a question, one from before a reload too, and not for a quick action', () => {
    const c = chat();
    const stopFor = (call) => renderHook(() => useChatQueue({ chat: c, runner: { busy: true, call }, cli, onSend: vi.fn() })).result.current.box.onStop;
    expect(stopFor({ what: { ask: true } })).toBe(c.stop);
    expect(stopFor({ what: {}, remote: true })).toBe(c.stop);
    expect(stopFor({ what: { noun: 'Check' } })).toBeNull();
  });

  it('asks a question that got no answer again the way it was asked', () => {
    const missed = { question: 'compare them', screen: { page: 'postings', sort: 'match' } };
    const c = chat({ missed });
    const { result } = renderHook(() => useChatQueue({ chat: c, runner: { busy: false, call: null }, cli, onSend: vi.fn() }));
    result.current.missed.onAgain();
    expect(c.ask).toHaveBeenCalledWith('compare them', { page: 'postings', sort: 'match' });
  });
});
