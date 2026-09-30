import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import AskAiToggle from './AskAiToggle.jsx';
import { chatSession } from '../lib/chatSession.js';

const dot = (container) => container.querySelector('[data-dot]')?.getAttribute('data-dot') ?? null;

describe('AskAiToggle', () => {
  it('is a plain Ask AI switch with nothing going on', () => {
    const onToggle = vi.fn();
    const { container } = render(<AskAiToggle open={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ask AI' }));
    expect(onToggle).toHaveBeenCalled();
    expect(dot(container)).toBeNull();
  });

  it('breathes while a question is answered with the panel closed, then holds still for an unread answer', () => {
    const { container, rerender } = render(<AskAiToggle open={false} onToggle={() => {}} />);
    act(() => chatSession.set({ call: { what: { say: 'q' }, events: [], startedAt: 0 } }));
    expect(dot(container)).toBe('working');
    expect(screen.getByRole('button', { name: 'Ask AI' })).toHaveAttribute('title', 'The AI is answering your question');
    act(() => chatSession.set({ call: null, unseen: true }));
    expect(dot(container)).toBe('waiting');
    rerender(<AskAiToggle open onToggle={() => {}} />);
    expect(dot(container)).toBeNull();
  });
});
