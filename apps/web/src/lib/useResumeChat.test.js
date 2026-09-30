import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResumeChat } from './useResumeChat.js';

const chatOf = (open) => {
  const chat = { open, show: vi.fn(() => { chat.open = true; }), close: vi.fn(() => { chat.open = false; }), toggle: vi.fn() };
  return chat;
};
const wide = () => true;

describe('useResumeChat', () => {
  it('opens a closed chat on arriving, and closes it again on leaving', () => {
    const chat = chatOf(false);
    const { rerender } = renderHook(({ view }) => useResumeChat(view, chat, wide), { initialProps: { view: 'resume' } });
    expect(chat.show).toHaveBeenCalled();
    rerender({ view: 'postings' });
    expect(chat.close).toHaveBeenCalled();
  });

  it('leaves a chat that was already open alone', () => {
    const chat = chatOf(true);
    const { rerender } = renderHook(({ view }) => useResumeChat(view, chat, wide), { initialProps: { view: 'resume' } });
    rerender({ view: 'settings' });
    expect(chat.show).not.toHaveBeenCalled();
    expect(chat.close).not.toHaveBeenCalled();
  });

  // A toggle by hand on the page makes the chat the person's own.
  it('keeps the person’s own choice on leaving', () => {
    const chat = chatOf(false);
    const { result, rerender } = renderHook(({ view }) => useResumeChat(view, chat, wide), { initialProps: { view: 'resume' } });
    act(() => result.current());
    expect(chat.toggle).toHaveBeenCalled();
    rerender({ view: 'profile' });
    expect(chat.close).not.toHaveBeenCalled();
  });

  it('does not open the chat on a narrow window, where it would cover the documents', () => {
    const chat = chatOf(false);
    renderHook(() => useResumeChat('resume', chat, () => false));
    expect(chat.show).not.toHaveBeenCalled();
  });
});
