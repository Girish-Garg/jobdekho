import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import PostingList from './PostingList.jsx';

const noop = () => {};
const handlers = { onOpen: noop, onSelect: noop, onStatus: noop, onUndo: noop };
const posting = (over) => ({
  company: 'Acme', firstSeenAt: new Date().toISOString(), status: null, level: 'mid', ...over,
});

describe('PostingList', () => {
  it('renders one row per posting inside a grid', () => {
    const postings = [posting({ id: 'a', title: 'Alpha' }), posting({ id: 'b', title: 'Beta' })];
    render(<PostingList postings={postings} selectedId={null} {...handlers} />);
    const list = screen.getByTestId('posting-list');
    expect(within(list).getAllByRole('row')).toHaveLength(2);
  });

  it('suppresses a work mode shared by most of the page but keeps the odd one out', () => {
    const postings = [
      posting({ id: 'a', title: 'Alpha', workMode: 'remote' }),
      posting({ id: 'b', title: 'Beta', workMode: 'remote' }),
      posting({ id: 'c', title: 'Gamma', workMode: 'hybrid' }),
    ];
    render(<PostingList postings={postings} selectedId={null} {...handlers} />);
    expect(screen.queryByText('Remote')).not.toBeInTheDocument();
    expect(screen.getByText(/Hybrid/)).toBeInTheDocument();
  });

  it('does not throw scrolling the selected row into view, jsdom or not', () => {
    const postings = [posting({ id: 'a', title: 'Alpha' }), posting({ id: 'b', title: 'Beta' })];
    expect(() =>
      render(<PostingList postings={postings} selectedId="b" {...handlers} />),
    ).not.toThrow();
  });

  it('passes the flash id through so only that row shows the undo affordance', () => {
    const postings = [posting({ id: 'a', title: 'Alpha', status: 'dismissed' })];
    render(<PostingList postings={postings} selectedId={null} flashId="a" {...handlers} />);
    expect(screen.getByText(/Dismissed\./)).toBeInTheDocument();
  });
});
