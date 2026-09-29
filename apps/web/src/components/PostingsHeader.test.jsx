import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PostingsHeader from './PostingsHeader.jsx';

describe('PostingsHeader', () => {
  it('says how many rows are shown and how many are new today', () => {
    render(<PostingsHeader shown={12} fresh={3} />);
    expect(screen.getByText('12 shown')).toBeInTheDocument();
    expect(screen.getByText(/3 new today/)).toBeInTheDocument();
  });

  it('leaves the fresh count out entirely when nothing is new', () => {
    const { container } = render(<PostingsHeader shown={12} fresh={0} />);
    expect(screen.queryByText(/new today/)).not.toBeInTheDocument();
    expect(container.querySelector('.text-primary')).toBeNull();
  });
});
