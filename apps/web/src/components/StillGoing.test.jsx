import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StillGoing from './StillGoing.jsx';

describe('StillGoing', () => {
  it('is a switch named by its words, and says whether it is on', () => {
    const { rerender } = render(<StillGoing on={false} onChange={() => {}} />);
    expect(screen.getByRole('switch', { name: 'Still going' })).toHaveAttribute('aria-checked', 'false');
    rerender(<StillGoing on onChange={() => {}} label="Currently studying" />);
    expect(screen.getByRole('switch', { name: 'Currently studying' })).toHaveAttribute('aria-checked', 'true');
  });

  it('flips from the switch and from its words, handing up the new state', () => {
    const onChange = vi.fn();
    const { rerender } = render(<StillGoing on={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Still going' }));
    expect(onChange).toHaveBeenLastCalledWith(true);
    rerender(<StillGoing on onChange={onChange} />);
    fireEvent.click(screen.getByText('Still going'));
    expect(onChange).toHaveBeenLastCalledWith(false);
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
