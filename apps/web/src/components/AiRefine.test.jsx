import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AiRefine from './AiRefine.jsx';

describe('AiRefine', () => {
  it('names the CLI in the cost note, quietly, near the input', () => {
    render(<AiRefine label="Claude Code" busy={false} onRefine={vi.fn()} />);
    expect(screen.getByText('Refining asks Claude Code again, on your own subscription.')).toBeInTheDocument();
  });

  it('calls back with the trimmed instruction and clears the field', () => {
    const onRefine = vi.fn();
    render(<AiRefine label="Claude Code" busy={false} onRefine={onRefine} />);
    const input = screen.getByPlaceholderText('What should change?');
    fireEvent.change(input, { target: { value: '  shorter  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Refine' }));
    expect(onRefine).toHaveBeenCalledWith('shorter');
    expect(input).toHaveValue('');
  });

  it('does not call back for a blank instruction', () => {
    const onRefine = vi.fn();
    render(<AiRefine label="Claude Code" busy={false} onRefine={onRefine} />);
    fireEvent.change(screen.getByPlaceholderText('What should change?'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Refine' }));
    expect(onRefine).not.toHaveBeenCalled();
  });

  it('disables the field and the button while busy', () => {
    render(<AiRefine label="Claude Code" busy={true} onRefine={vi.fn()} />);
    expect(screen.getByPlaceholderText('What should change?')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Refine' })).toBeDisabled();
  });

  it('does not add a confirm step: one click is enough to ask', () => {
    const onRefine = vi.fn();
    render(<AiRefine label="Claude Code" busy={false} onRefine={onRefine} />);
    fireEvent.change(screen.getByPlaceholderText('What should change?'), { target: { value: 'shorter' } });
    fireEvent.click(screen.getByRole('button', { name: 'Refine' }));
    expect(onRefine).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
