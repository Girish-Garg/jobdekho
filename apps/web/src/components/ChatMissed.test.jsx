import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatMissed from './ChatMissed.jsx';

const handlers = () => ({ onAgain: vi.fn(), onEdit: vi.fn(), onRecheck: vi.fn() });

describe('ChatMissed', () => {
  it('keeps a stopped question with what had been written, and asks it again', () => {
    const on = handlers();
    render(<ChatMissed missed={{ question: 'compare them', kind: 'stopped', text: 'Both are **Writesonic** roles', elapsedMs: 14000 }} {...on} />);
    expect(screen.getByText('compare them')).toBeInTheDocument();
    expect(screen.getByText('Writesonic')).toBeInTheDocument();
    expect(screen.getByText('You stopped it after 14s')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ask again' }));
    expect(on.onAgain).toHaveBeenCalled();
  });

  it('says why a failed question got no answer, once, with Ask again and Edit question', () => {
    const on = handlers();
    render(<ChatMissed missed={{ question: 'who hires freshers?', kind: 'timeout', message: 'Claude Code did not answer within 180 seconds.' }} {...on} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Claude Code did not answer within 180 seconds.');
    fireEvent.click(screen.getByRole('button', { name: 'Edit question' }));
    expect(on.onEdit).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Check again' })).not.toBeInTheDocument();
  });

  it('offers the re-probe when the CLI went missing', () => {
    const on = handlers();
    render(<ChatMissed missed={{ question: 'hi', kind: 'not_found', message: 'Claude Code is not installed.' }} {...on} />);
    fireEvent.click(screen.getByRole('button', { name: 'Check again' }));
    expect(on.onRecheck).toHaveBeenCalled();
  });
});
