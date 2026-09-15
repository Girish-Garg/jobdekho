import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DensityToggle from './DensityToggle.jsx';

describe('DensityToggle', () => {
  it('marks the active mode as pressed and the other as not', () => {
    render(<DensityToggle mode="list" setMode={() => {}} />);
    expect(screen.getByRole('button', { name: 'Rows' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Cards' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls setMode with the clicked mode', () => {
    const setMode = vi.fn();
    render(<DensityToggle mode="list" setMode={setMode} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cards' }));
    expect(setMode).toHaveBeenCalledWith('grid');
  });

  it('shows both options at once rather than cycling a single button', () => {
    render(<DensityToggle mode="grid" setMode={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });
});
