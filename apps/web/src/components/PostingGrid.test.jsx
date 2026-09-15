import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import PostingGrid from './PostingGrid.jsx';

const noop = () => {};
const posting = (over) => ({
  company: 'Acme', firstSeenAt: new Date().toISOString(), status: null, level: 'mid', ...over,
});

describe('PostingGrid', () => {
  it('renders one card per posting', () => {
    const postings = [posting({ id: 'a', title: 'Alpha' }), posting({ id: 'b', title: 'Beta' })];
    render(<PostingGrid postings={postings} selectedId={null} onOpen={noop} />);
    const grid = screen.getByTestId('posting-grid');
    expect(within(grid).getAllByRole('button')).toHaveLength(2);
  });

  it('passes the selection down so the matching card can highlight itself', () => {
    render(<PostingGrid postings={[posting({ id: 'a', title: 'Alpha' })]} selectedId="a" onOpen={noop} />);
    expect(screen.getByRole('button', { name: /Alpha/ }).className).toContain('bg-select');
  });

  it('does not throw scrolling the selected card into view, jsdom or not', () => {
    const postings = [posting({ id: 'a', title: 'Alpha' }), posting({ id: 'b', title: 'Beta' })];
    expect(() => render(<PostingGrid postings={postings} selectedId="b" onOpen={noop} />)).not.toThrow();
  });
});
