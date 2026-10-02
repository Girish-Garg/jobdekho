import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatActions from './ChatActions.jsx';

// Built from the filters an answer set, so it can be longer than the panel is wide.
const LONG = 'Show mid and senior level, remote or hybrid, grade B or better, only Acme, Beta and Gamma';
const SORT = { type: 'sort', value: 'newest', label: 'Sort by newest first' };
const FILTERS = { type: 'filters', patch: {}, label: LONG };

describe('ChatActions', () => {
  it('offers each action by its label and applies only the one that is pressed', () => {
    const onApply = vi.fn();
    render(<ChatActions actions={[SORT, FILTERS]} onApply={onApply} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sort by newest first' }));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith(SORT);
  });

  it('lets a long label wrap inside the panel instead of running past its edge', () => {
    render(<ChatActions actions={[FILTERS]} onApply={vi.fn()} />);
    expect(screen.getByRole('button', { name: LONG })).toHaveClass('whitespace-normal');
  });
});
