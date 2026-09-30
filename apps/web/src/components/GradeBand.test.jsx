import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PostingList from './PostingList.jsx';
import PostingGrid from './PostingGrid.jsx';

const noop = () => {};
const posting = (id, grade) => ({ id, grade, title: `Job ${id}`, company: 'Acme', firstSeenAt: new Date().toISOString(), level: 'mid', fit: 60 });
const rows = [posting('1', 'A'), posting('2', 'A'), posting('3', 'B')];

// Where each grade begins in the feed, with the whole feed's count for it.
describe('grade band dividers', () => {
  it('opens each grade in the list with its word and count', () => {
    render(<PostingList postings={rows} bands={{ A: 12, B: 40 }} selectedId={null} onOpen={noop} onSelect={noop} onStatus={noop} onUndo={noop} />);
    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(2);
    expect(headers[0]).toHaveTextContent('Strong fit');
    expect(headers[0]).toHaveTextContent('12 jobs');
    expect(headers[1]).toHaveTextContent('Good fit');
  });

  it('heads each grade across the card grid', () => {
    render(<PostingGrid postings={rows} bands={{ A: 1 }} selectedId={null} onOpen={noop} />);
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['AStrong fit1 job', 'BGood fit']);
  });

  it('draws no dividers on an unranked feed', () => {
    render(<PostingList postings={[{ ...rows[0], grade: undefined }]} selectedId={null} onOpen={noop} onSelect={noop} onStatus={noop} onUndo={noop} />);
    expect(screen.queryByRole('columnheader')).toBeNull();
  });
});
