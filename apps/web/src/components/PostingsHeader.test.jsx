import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PostingsHeader from './PostingsHeader.jsx';

describe('PostingsHeader', () => {
  // The counts are the whole match's, from the server, not the loaded page.
  it('says how many of the matching postings are loaded, and how many are new today', () => {
    render(<PostingsHeader shown={100} total={1234} fresh={37} />);
    expect(screen.getByText('100 of 1,234 shown')).toBeInTheDocument();
    expect(screen.getByText(/37 new today/)).toBeInTheDocument();
  });

  it('just counts the postings once all of them are loaded', () => {
    render(<PostingsHeader shown={12} total={12} fresh={3} />);
    expect(screen.getByText('12 postings')).toBeInTheDocument();
  });

  it('leaves the fresh count out entirely when nothing is new', () => {
    const { container } = render(<PostingsHeader shown={12} fresh={0} />);
    expect(screen.queryByText(/new today/)).not.toBeInTheDocument();
    expect(container.querySelector('.text-primary')).toBeNull();
  });
});
