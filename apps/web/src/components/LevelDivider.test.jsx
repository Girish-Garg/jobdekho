import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import PostingList from './PostingList.jsx';
import PostingGrid from './PostingGrid.jsx';

const noop = () => {};
const handlers = { onOpen: noop, onSelect: noop, onStatus: noop, onUndo: noop };
const posting = (id, grade, over = {}) => ({ id, grade, title: `Job ${id}`, company: 'Acme', fit: 60, level: 'senior', ...over });
const unstated = (id, grade) => posting(id, grade, { level: null, levelNotStated: true });

// Under a seniority filter the postings that do not say their level come
// after every confirmed one, under a quiet divider with the whole feed's
// count of them.
describe('the Level not stated divider', () => {
  it('opens the unstated part of the list with its count, and the grades run again under it', () => {
    const rows = [posting('1', 'B'), posting('2', 'F'), unstated('3', 'F'), unstated('4', 'F')];
    render(<PostingList postings={rows} bands={{ B: 4, F: 30 }} notStated={335} selectedId={null} {...handlers} />);
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual(['BGood fit', 'FEverything else', 'Level not stated335 jobs', 'FEverything else']);
    // The divider sits right before the first posting that states no level.
    const divider = screen.getByText('Level not stated').closest('[role="row"]');
    expect(divider.nextElementSibling.nextElementSibling).toHaveAttribute('data-row-id', '3');
  });

  it('drops the band counts while the split holds postings, since a count spans both parts', () => {
    render(<PostingList postings={[posting('1', 'A')]} bands={{ A: 12 }} notStated={5} selectedId={null} {...handlers} />);
    expect(screen.getByRole('columnheader')).not.toHaveTextContent('12 jobs');
  });

  // A page can start inside the part: no confirmed posting matched at all.
  it('heads the list when its very first posting states no level', () => {
    render(<PostingList postings={[unstated('a', 'A'), unstated('b', 'A')]} bands={{ A: 2 }} notStated={2} selectedId={null} {...handlers} />);
    const list = screen.getByTestId('posting-list');
    expect(list.firstElementChild).toHaveTextContent('Level not stated2 jobs');
    expect(within(list).getAllByText('Level not stated')).toHaveLength(1);
  });

  it('divides the card grid the same way', () => {
    const rows = [posting('1', 'C'), unstated('2', 'C')];
    render(<PostingGrid postings={rows} bands={{ C: 9 }} notStated={1} selectedId={null} onOpen={noop} />);
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['CWorth a look', 'Level not stated1 job', 'CWorth a look']);
  });

  it('is not there without a level filter', () => {
    render(<PostingList postings={[posting('1', 'A'), posting('2', 'B')]} bands={{ A: 1, B: 1 }} selectedId={null} {...handlers} />);
    expect(screen.queryByText('Level not stated')).not.toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')[0]).toHaveTextContent('1 job');
  });
});
