import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProfileEmptyState from './ProfileEmptyState.jsx';

describe('ProfileEmptyState', () => {
  it('points at the quickest ways in and says everything can be typed directly', () => {
    render(<ProfileEmptyState />);
    expect(screen.getByText(/upload your resume/i)).toBeInTheDocument();
    expect(screen.getByText(/tell the chat/i)).toBeInTheDocument();
    expect(screen.getByText(/can also be typed in directly/i)).toBeInTheDocument();
  });

  // The record under it is open already, so there is nothing to start.
  it('is a line of text, not a card with a button to press', () => {
    render(<ProfileEmptyState />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
