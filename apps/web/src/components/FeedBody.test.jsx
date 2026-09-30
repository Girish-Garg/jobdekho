import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FeedBody from './FeedBody.jsx';

const noop = () => {};
const handlers = { onOpen: noop, onSelect: noop, onStatus: noop, onUndo: noop };
const posting = (over) => ({
  company: 'Acme', firstSeenAt: new Date().toISOString(), status: null, level: 'mid', ...over,
});
const EMPTY_FILTERS = {
  excludedSources: [], levels: [], workModes: [], q: '', status: '',
  maxDegree: '', minStipend: '', maxMonths: '', maxExp: '', minFit: '',
};

describe('FeedBody', () => {
  it('shows the skeleton while loading, never the list or the grid', () => {
    render(<FeedBody loading rows={[]} viewMode="list" filters={EMPTY_FILTERS} {...handlers} />);
    expect(screen.getByTestId('feed-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('posting-list')).not.toBeInTheDocument();
  });

  it('shows the default empty message once loaded with nothing to show', () => {
    render(<FeedBody loading={false} rows={[]} viewMode="list" filters={EMPTY_FILTERS} {...handlers} />);
    expect(screen.getByText('Nothing matches these filters yet.')).toBeInTheDocument();
  });

  it('names the active filter in the empty message', () => {
    render(
      <FeedBody loading={false} rows={[]} viewMode="list" filters={{ ...EMPTY_FILTERS, minFit: '40' }} {...handlers} />,
    );
    expect(screen.getByText(/Grade B or better filter/)).toBeInTheDocument();
  });

  it('renders the list in list mode', () => {
    render(
      <FeedBody loading={false} rows={[posting({ id: 'a', title: 'Alpha' })]} viewMode="list" filters={EMPTY_FILTERS} {...handlers} />,
    );
    expect(screen.getByTestId('posting-list')).toBeInTheDocument();
  });

  it('renders the grid in grid mode', () => {
    render(
      <FeedBody loading={false} rows={[posting({ id: 'a', title: 'Alpha' })]} viewMode="grid" filters={EMPTY_FILTERS} {...handlers} />,
    );
    expect(screen.getByTestId('posting-grid')).toBeInTheDocument();
  });
});
