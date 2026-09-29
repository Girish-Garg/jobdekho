import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PostingChips from './PostingChips.jsx';

describe('PostingChips', () => {
  it('shows the level, the work mode and what the person already did', () => {
    render(<PostingChips posting={{ level: 'mid', workMode: 'remote', status: 'applied' }} />);
    expect(screen.getByText('Mid')).toBeInTheDocument();
    expect(screen.getByText('Remote')).toBeInTheDocument();
    expect(screen.getByText('Applied')).toBeInTheDocument();
  });

  it('says a job first seen today is new', () => {
    render(<PostingChips posting={{ firstSeenAt: new Date().toISOString() }} />);
    expect(screen.getByText('New today')).toBeInTheDocument();
  });

  it('renders nothing when there is nothing to say', () => {
    const { container } = render(<PostingChips posting={{}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
