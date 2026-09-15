import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FeedSkeleton from './FeedSkeleton.jsx';

describe('FeedSkeleton', () => {
  it('is hidden from the accessibility tree, since it carries no information yet', () => {
    render(<FeedSkeleton />);
    expect(screen.getByTestId('feed-skeleton')).toHaveAttribute('aria-hidden', 'true');
  });

  it('shapes itself like rows by default', () => {
    render(<FeedSkeleton />);
    expect(screen.getByTestId('feed-skeleton').className).not.toContain('grid-cols-1');
  });

  it('shapes itself like cards in grid mode', () => {
    render(<FeedSkeleton mode="grid" />);
    expect(screen.getByTestId('feed-skeleton').className).toContain('grid-cols-1');
  });

  it('never renders a spinner', () => {
    render(<FeedSkeleton />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
