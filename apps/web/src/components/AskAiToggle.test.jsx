import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import AskAiToggle from './AskAiToggle.jsx';
import { chatStore } from '../lib/chatStore.js';

const dot = (container) => container.querySelector('[data-dot]')?.getAttribute('data-dot') ?? null;

describe('AskAiToggle', () => {
  it('is a plain Ask AI switch with nothing going on', () => {
    const onToggle = vi.fn();
    const { container } = render(<AskAiToggle open={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ask AI' }));
    expect(onToggle).toHaveBeenCalled();
    expect(dot(container)).toBeNull();
  });

  it('breathes while a call runs in any chat with the panel closed, then holds still for an answer not yet seen', () => {
    const { container, rerender } = render(<AskAiToggle open={false} onToggle={() => {}} />);
    act(() => chatStore.set({ busy: { chatId: 'c-pA', label: 'Is it real?', events: [], startedAt: 0 } }));
    expect(dot(container)).toBe('working');
    expect(screen.getByRole('button', { name: 'Ask AI' })).toHaveAttribute('title', 'The AI is answering in one of your chats');
    act(() => chatStore.set({ busy: null, unseen: { 'c-pA': true } }));
    expect(dot(container)).toBe('waiting');
    rerender(<AskAiToggle open onToggle={() => {}} />);
    expect(dot(container)).toBeNull();
  });

  it('says an answer is waiting from the list the server keeps, before the panel was ever opened', () => {
    const { container } = render(<AskAiToggle open={false} onToggle={() => {}} />);
    act(() => chatStore.set({ list: [{ id: 'g1', unseen: true }] }));
    expect(dot(container)).toBe('waiting');
  });
});
