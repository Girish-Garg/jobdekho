import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProfileEmptyState from './ProfileEmptyState.jsx';

describe('ProfileEmptyState', () => {
  it('explains what the profile is for, not just that it is missing', () => {
    render(<ProfileEmptyState onStart={() => {}} />);
    expect(screen.getByText(/best fit ranking/i)).toBeInTheDocument();
    expect(screen.getByText(/notification filter/i)).toBeInTheDocument();
  });

  it('opens the blank form for the no-resume path', () => {
    const onStart = vi.fn();
    render(<ProfileEmptyState onStart={onStart} />);
    fireEvent.click(screen.getByRole('button', { name: 'Fill it in by hand' }));
    expect(onStart).toHaveBeenCalled();
  });
});
