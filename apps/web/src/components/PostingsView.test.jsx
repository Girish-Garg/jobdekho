import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within, act } from '@testing-library/react';
import { useState } from 'react';
import PostingsView from './PostingsView.jsx';
import { useViewMode } from '../lib/viewMode.js';

// The state Shell keeps for the feed; the feed draws its own sort and
// density controls (see FeedTop.jsx), so a test changes them there.
function Harness(props) {
  const [sort, setSort] = useState('match');
  const [viewMode, setViewMode] = useViewMode();
  return <PostingsView setFilters={() => {}} {...props} sort={sort} setSort={setSort} viewMode={viewMode} setViewMode={setViewMode} />;
}

vi.mock('../api.js', () => ({
  getScrapeState: vi.fn(async () => ({ running: false, startedAt: null, finishedAt: null, done: 0, total: 0, lastRun: null })),
  startScrape: vi.fn(async () => ({ running: true, done: 0, total: 0 })),
  getScrapeSettings: vi.fn(async () => ({ autoRefresh: true })),
  putScrapeSettings: vi.fn(async () => null),
  getSetup: vi.fn(async () => []),
  getPostings: vi.fn(async () => []),
  getPostingsPage: vi.fn(),
  getSources: vi.fn(async () => []),
  setStatus: vi.fn(async () => null),
}));

import { getPostings, getPostingsPage, setStatus, getSetup } from '../api.js';
import { announceRefreshed } from '../lib/postingsRefreshedSignal.js';

// The feed reads a page with its counts; these tests speak in postings, so
// the page call answers with whatever getPostings is set to return.
getPostingsPage.mockImplementation(async (params) => {
  const postings = await getPostings(params);
  return { postings, total: postings.length, newToday: 0 };
});

const EMPTY = {
  excludedSources: [], levels: [], workModes: [], q: '', status: '',
  maxDegree: '', minStipend: '', maxMonths: '', maxExp: '', minFit: '',
};

const row = (over) => ({
  id: 'p1',
  source: 'levels',
  company: 'Acme',
  title: 'Engineer',
  url: 'https://example.com/p1',
  descriptionSnippet: 'Ship the thing.',
  firstSeenAt: new Date().toISOString(),
  status: null,
  level: 'mid',
  degreeMin: 'none',
  degreeRequired: false,
  ...over,
});

// The feed's default view is rows: every option carries its title, company
// and the rest of its own text as its accessible name, the same way the old
// card button did, so a name regex still finds the right one.
const card = (name) => screen.getByRole('row', { name: new RegExp(name) });

const mockWide = (matches) => {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches, media: query, addEventListener: () => {}, removeEventListener: () => {},
  }));
};

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

afterEach(() => {
  delete window.matchMedia;
});

describe('PostingsView server-side filters', () => {
  // The feed opens personalised; the server's default is match too, but the
  // select needs to show the order the list actually has.
  it('asks for the best-fit ordering on the very first request', async () => {
    render(<Harness filters={EMPTY} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalled());
    expect(getPostings).toHaveBeenCalledWith(expect.objectContaining({ sort: 'match' }));
  });

  it('sends the fit floor as minFit', async () => {
    render(<Harness filters={{ ...EMPTY, minFit: '30' }} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalled());
    expect(getPostings).toHaveBeenCalledWith(expect.objectContaining({ minFit: '30' }));
  });

  // The whole point of fit-as-a-filter: another sort reorders the matches, it
  // does not widen the feed back out.
  it('keeps the fit floor in the request when the sort changes to newest', async () => {
    render(<Harness filters={{ ...EMPTY, minFit: '50' }} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /^Sort:/ }));
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /^Newest posted/ }));
    await waitFor(() =>
      expect(getPostings).toHaveBeenLastCalledWith(
        expect.objectContaining({ sort: 'newest', minFit: '50' }),
      ),
    );
  });

  it('sends levels comma-separated and maxDegree as query params', async () => {
    render(<Harness filters={{ ...EMPTY, levels: ['mid', 'staff'], maxDegree: 'masters' }} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalled());
    expect(getPostings).toHaveBeenCalledWith(
      expect.objectContaining({ levels: 'mid,staff', maxDegree: 'masters' }),
    );
  });

  it('sends the excluded sources comma-separated, never an include-list', async () => {
    render(<Harness filters={{ ...EMPTY, excludedSources: ['lever', 'ashby'] }} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalled());
    expect(getPostings).toHaveBeenCalledWith(expect.objectContaining({ excludedSources: 'lever,ashby' }));
    expect(getPostings.mock.calls[0][0]).not.toHaveProperty('sources');
  });

  it('sends the picked work modes comma-separated', async () => {
    render(<Harness filters={{ ...EMPTY, workModes: ['remote', 'hybrid'] }} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalled());
    expect(getPostings).toHaveBeenCalledWith(expect.objectContaining({ workModes: 'remote,hybrid' }));
  });

  it('sends empty strings for the unset multi-selects', async () => {
    render(<Harness filters={EMPTY} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalled());
    expect(getPostings).toHaveBeenCalledWith(
      expect.objectContaining({ levels: '', excludedSources: '', workModes: '' }),
    );
  });

  it('does not filter by level or work mode on the client', async () => {
    getPostings.mockResolvedValueOnce([row({ level: 'executive', workMode: 'onsite' })]);
    render(<Harness filters={{ ...EMPTY, levels: ['mid'], workModes: ['remote'] }} />);
    expect(await screen.findByText('Engineer')).toBeInTheDocument();
  });
});

describe('PostingsView refetch triggers', () => {
  it('refetches when a server-side field changes', async () => {
    const { rerender } = render(<Harness filters={EMPTY} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalledTimes(1));

    rerender(<Harness filters={{ ...EMPTY, levels: ['senior'] }} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalledTimes(2));

    rerender(<Harness filters={{ ...EMPTY, levels: ['senior'], maxDegree: 'phd' }} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalledTimes(3));
  });

  it('refetches when the exclusions or the work modes change', async () => {
    const { rerender } = render(<Harness filters={EMPTY} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalledTimes(1));

    rerender(<Harness filters={{ ...EMPTY, excludedSources: ['lever'] }} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalledTimes(2));

    rerender(<Harness filters={{ ...EMPTY, excludedSources: ['lever'], workModes: ['remote'] }} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalledTimes(3));
  });

  it('does not refetch when the same arrays arrive in new objects', async () => {
    const seed = { ...EMPTY, excludedSources: ['lever'], workModes: ['remote'] };
    const { rerender } = render(<Harness filters={seed} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalledTimes(1));

    rerender(<Harness filters={{ ...EMPTY, excludedSources: ['lever'], workModes: ['remote'] }} />);
    await Promise.resolve();
    expect(getPostings).toHaveBeenCalledTimes(1);
  });

  // These three used to be narrowed in the browser, which only ever filtered
  // the loaded page. They are server-side now, so each one must refetch.
  it('refetches when a measure filter changes', async () => {
    const { rerender } = render(<Harness filters={EMPTY} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalledTimes(1));

    rerender(<Harness filters={{ ...EMPTY, minStipend: '5000' }} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalledTimes(2));
    rerender(<Harness filters={{ ...EMPTY, minStipend: '5000', maxExp: '2' }} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalledTimes(3));
    rerender(<Harness filters={{ ...EMPTY, minStipend: '5000', maxExp: '2', maxMonths: '3' }} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalledTimes(4));
  });

  it('does not refetch when an identical filters object is recreated', async () => {
    const { rerender } = render(<Harness filters={{ ...EMPTY }} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalledTimes(1));

    rerender(<Harness filters={{ ...EMPTY }} />);
    await Promise.resolve();
    expect(getPostings).toHaveBeenCalledTimes(1);
  });

  it('refetches when the fit floor changes', async () => {
    const { rerender } = render(<Harness filters={EMPTY} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalledTimes(1));

    rerender(<Harness filters={{ ...EMPTY, minFit: '30' }} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalledTimes(2));
  });
});

describe('PostingsView measure filters go to the server', () => {
  it('sends the three measures as query params instead of filtering locally', async () => {
    render(<Harness filters={{ ...EMPTY, minStipend: '10000', maxExp: '2', maxMonths: '6' }} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalled());
    expect(getPostings).toHaveBeenLastCalledWith(expect.objectContaining({
      minStipend: '10000', maxExperienceYears: '2', maxDurationMonths: '6',
    }));
  });

  // Whatever the API returns is what the feed shows. Re-filtering here would
  // narrow only the loaded page and disagree with the "N shown" count.
  it('renders every row the server returned', async () => {
    getPostings.mockResolvedValueOnce([
      row({ id: 'a', title: 'Rich', stipend: 'Rs 20,000' }),
      row({ id: 'b', title: 'Poor', stipend: 'Rs 1,000' }),
    ]);
    render(<Harness filters={{ ...EMPTY, minStipend: '10000' }} />);
    expect(await screen.findByText('Rich')).toBeInTheDocument();
    expect(screen.getByText('Poor')).toBeInTheDocument();
  });
});

describe('PostingsView rows and view mode', () => {
  it('renders rows in a grid by default', async () => {
    getPostings.mockResolvedValueOnce([row({ id: 'a', title: 'Alpha' }), row({ id: 'b', title: 'Beta' })]);
    render(<Harness filters={EMPTY} />);
    const list = await screen.findByTestId('posting-list');
    expect(within(list).getAllByRole('row')).toHaveLength(2);
  });

  it('switches to the card grid via the density toggle and remembers the choice', async () => {
    getPostings.mockResolvedValueOnce([row({ id: 'a', title: 'Alpha' })]);
    render(<Harness filters={EMPTY} />);
    await screen.findByTestId('posting-list');

    fireEvent.click(screen.getByRole('button', { name: 'Cards' }));
    expect(await screen.findByTestId('posting-grid')).toBeInTheDocument();
    expect(window.localStorage.getItem('jobdekho-view-mode')).toBe('grid');
  });

  it('says so when nothing matches', async () => {
    render(<Harness filters={EMPTY} />);
    expect(await screen.findByText('Nothing matches these filters yet.')).toBeInTheDocument();
    expect(screen.queryByTestId('posting-list')).not.toBeInTheDocument();
  });

  it('names the active filter when nothing matches it', async () => {
    render(<Harness filters={{ ...EMPTY, minFit: '40' }} />);
    expect(await screen.findByText(/Grade B or better filter/)).toBeInTheDocument();
  });

  it('shows skeleton rows instead of a spinner or a loading line while the first page is in flight', async () => {
    let deliver;
    getPostings.mockReturnValueOnce(new Promise((resolve) => { deliver = resolve; }));
    render(<Harness filters={EMPTY} />);

    expect(screen.getByTestId('feed-skeleton')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByText(/Fetching/)).not.toBeInTheDocument();

    await act(async () => deliver([]));
  });
});

describe('PostingsView best-fit ranking', () => {
  const NAMES = { company: 'Company A-Z', newest: 'Newest posted' };
  const pickSort = (value) => {
    fireEvent.click(screen.getByRole('button', { name: /^Sort:/ }));
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: new RegExp(`^${NAMES[value]}`) }));
  };

  it('lets another sort replace the match ordering', async () => {
    getPostings.mockResolvedValue([row()]);
    render(<Harness filters={EMPTY} onOpenProfile={() => {}} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalledTimes(1));
    pickSort('company');
    await waitFor(() =>
      expect(getPostings).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'company' })),
    );
  });

  // The server quietly falls back to newest ordering when it has nothing to
  // rank against, and it says so by omitting fit from the rows. Reading that
  // omission is what also catches a profile that exists but has nothing
  // rankable in it - a case a profile fetch could never tell apart.
  it('says so on load when the rows come back unranked, and points at the profile section', async () => {
    getPostings.mockResolvedValue([row()]);
    const onOpenProfile = vi.fn();
    render(<Harness filters={EMPTY} onOpenProfile={onOpenProfile} />);

    expect(await screen.findByText(/needs a profile/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Set up your profile' }));
    expect(onOpenProfile).toHaveBeenCalled();
  });

  // With no fit floor, only the best-fit order claims a ranking, so leaving
  // it takes the banner away too.
  it('drops the notice when the user leaves the best-fit order', async () => {
    getPostings.mockResolvedValue([row()]);
    render(<Harness filters={EMPTY} onOpenProfile={() => {}} />);
    expect(await screen.findByText(/needs a profile/i)).toBeInTheDocument();

    pickSort('newest');
    await waitFor(() => expect(screen.queryByText(/needs a profile/i)).not.toBeInTheDocument());
  });

  // The server ignores minFit when it has no profile to score against, so a
  // set floor under any sort is a claim the feed does not honour. Without the
  // banner the control would just visibly do nothing.
  it('keeps the notice under a non-match sort while a fit floor is set', async () => {
    getPostings.mockResolvedValue([row()]);
    render(<Harness filters={{ ...EMPTY, minFit: '30' }} onOpenProfile={() => {}} />);
    expect(await screen.findByText(/needs a profile/i)).toBeInTheDocument();

    pickSort('newest');
    expect(await screen.findByText(/needs a profile/i)).toBeInTheDocument();
    expect(screen.getByText(/fit filter/i)).toBeInTheDocument();
  });

  it('never shows the notice when the rows came back ranked, floor or not', async () => {
    getPostings.mockResolvedValue([row({ fit: 58 })]);
    render(<Harness filters={{ ...EMPTY, minFit: '30' }} onOpenProfile={() => {}} />);
    expect(await screen.findByText('Engineer')).toBeInTheDocument();
    expect(screen.queryByText(/needs a profile/i)).not.toBeInTheDocument();

    pickSort('newest');
    expect(await screen.findByText('Engineer')).toBeInTheDocument();
    expect(screen.queryByText(/needs a profile/i)).not.toBeInTheDocument();
  });

  // rows are empty while the first page is in flight, so the banner has
  // nothing to read yet and must stay down - a banner that blinks on every
  // load would be worse than the gap it closes.
  it('keeps the banner down while the first page loads, then reads the rows', async () => {
    let deliver;
    getPostings.mockReturnValueOnce(new Promise((resolve) => { deliver = resolve; }));
    render(<Harness filters={{ ...EMPTY, minFit: '30' }} onOpenProfile={() => {}} />);

    expect(screen.getByTestId('feed-skeleton')).toBeInTheDocument();
    expect(screen.queryByText(/needs a profile/i)).not.toBeInTheDocument();

    await act(async () => deliver([row()]));
    expect(await screen.findByText(/needs a profile/i)).toBeInTheDocument();
  });

  // An empty page cannot say whether the server ranked, and the no-matches
  // copy already owns that state: a profile banner on top would fire for
  // anyone whose filters simply matched nothing.
  it('keeps the banner down when nothing matched', async () => {
    getPostings.mockResolvedValue([]);
    render(<Harness filters={{ ...EMPTY, minFit: '45' }} onOpenProfile={() => {}} />);

    expect(await screen.findByText(/Nothing matches/)).toBeInTheDocument();
    expect(screen.queryByText(/needs a profile/i)).not.toBeInTheDocument();
  });

  it('shows the server reasons in the overlay, not on the row', async () => {
    getPostings.mockResolvedValue([
      row({ title: 'React Engineer', fit: 58, reasons: ['matches react, typescript', 'suits your experience'] }),
    ]);
    render(<Harness filters={EMPTY} onOpenProfile={() => {}} />);
    expect(await screen.findByText('React Engineer')).toBeInTheDocument();

    // The row stays a scan unit; the reasons live in the overlay.
    expect(screen.queryByText(/matches react/)).not.toBeInTheDocument();
    fireEvent.click(card('React Engineer'));
    expect(await screen.findByText(/matches react, typescript/)).toBeInTheDocument();
    expect(screen.getByText(/suits your experience/)).toBeInTheDocument();
  });

  // Ranking is a dimension now, not a mode: the reasons ride each posting, so
  // they survive a sort change instead of vanishing with the old Recommended
  // sort. Newest now means "my matches, newest first".
  it('keeps the reasons in the overlay under the newest sort', async () => {
    getPostings.mockResolvedValue([
      row({ title: 'React Engineer', fit: 58, reasons: ['matches react, typescript'] }),
    ]);
    render(<Harness filters={EMPTY} onOpenProfile={() => {}} />);
    expect(await screen.findByText('React Engineer')).toBeInTheDocument();
    pickSort('newest');
    expect(await screen.findByText('React Engineer')).toBeInTheDocument();

    fireEvent.click(card('React Engineer'));
    expect(await screen.findByText(/matches react/)).toBeInTheDocument();
  });
});

describe('PostingsView legitimacy and grade', () => {
  it('shows the ghost signals in the overlay, not on the row', async () => {
    getPostings.mockResolvedValue([
      row({
        title: 'Ghost Engineer',
        legitimacy: 'low',
        ghostSignals: ['no pay stated', 'posted 4 months ago'],
      }),
    ]);
    render(<Harness filters={EMPTY} onOpenProfile={() => {}} />);
    expect(await screen.findByText('Ghost Engineer')).toBeInTheDocument();

    // The row carries the warning; the evidence stays in the overlay.
    expect(screen.getByText('Caution')).toBeInTheDocument();
    expect(screen.queryByText('no pay stated')).not.toBeInTheDocument();

    fireEvent.click(card('Ghost Engineer'));
    expect(await screen.findByText('no pay stated')).toBeInTheDocument();
    expect(screen.getByText('posted 4 months ago')).toBeInTheDocument();
  });

  it('shows the grade and the breakdown with the fit reasons in the overlay', async () => {
    getPostings.mockResolvedValue([
      row({
        title: 'React Engineer',
        fit: 45,
        reasons: ['matches react'],
        grade: 'B',
        breakdown: [{ dimension: 'skills', value: 0.9, weight: 45, points: 45, max: 50 }],
        legitimacy: 'high',
        ghostSignals: [],
      }),
    ]);
    render(<Harness filters={EMPTY} onOpenProfile={() => {}} />);
    expect(await screen.findByText('React Engineer')).toBeInTheDocument();

    fireEvent.click(card('React Engineer'));
    expect(await screen.findByText('Grade B')).toBeInTheDocument();
    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByText('45 of 50')).toBeInTheDocument();
  });

  it('keeps the grade and breakdown out of the overlay when the feed is unranked', async () => {
    getPostings.mockResolvedValue([
      row({ title: 'Engineer', legitimacy: 'high', ghostSignals: [] }),
    ]);
    render(<Harness filters={EMPTY} onOpenProfile={() => {}} />);
    expect(await screen.findByText('Engineer')).toBeInTheDocument();

    fireEvent.click(card('Engineer'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByText(/Grade/)).not.toBeInTheDocument();
  });
});

describe('PostingsView overlay', () => {
  beforeEach(() => getPostings.mockResolvedValue([row({ title: 'Engineer' })]));

  it('opens the detail overlay from a row', async () => {
    render(<Harness filters={EMPTY} />);
    expect(await screen.findByText('Engineer')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(card('Engineer'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Ship the thing.')).toBeInTheDocument();
  });

  it('closes on Escape and hands focus back to the row that opened it', async () => {
    render(<Harness filters={EMPTY} />);
    expect(await screen.findByText('Engineer')).toBeInTheDocument();

    const opener = card('Engineer');
    fireEvent.click(opener);
    expect(screen.getByRole('dialog')).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('closes on a backdrop click', async () => {
    render(<Harness filters={EMPTY} />);
    expect(await screen.findByText('Engineer')).toBeInTheDocument();

    fireEvent.click(card('Engineer'));
    fireEvent.click(screen.getByTestId('dialog-backdrop'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('applies a status from inside the overlay and keeps it optimistically', async () => {
    render(<Harness filters={EMPTY} />);
    expect(await screen.findByText('Engineer')).toBeInTheDocument();

    fireEvent.click(card('Engineer'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(setStatus).toHaveBeenCalledWith('p1', 'saved'));
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }))
      .toHaveAttribute('aria-pressed', 'true');
  });

  it('rolls the status back when the write fails', async () => {
    setStatus.mockRejectedValueOnce(new Error('offline'));
    render(<Harness filters={EMPTY} />);
    expect(await screen.findByText('Engineer')).toBeInTheDocument();

    fireEvent.click(card('Engineer'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }))
        .toHaveAttribute('aria-pressed', 'false'),
    );
  });
});

describe('PostingsView keyboard', () => {
  beforeEach(() => {
    getPostings.mockResolvedValue([
      row({ id: 'a', title: 'Alpha' }),
      row({ id: 'b', title: 'Beta' }),
      row({ id: 'c', title: 'Gamma' }),
    ]);
  });

  it('moves the selection with j/k, shown through aria-selected', async () => {
    render(<Harness filters={EMPTY} />);
    await screen.findByText('Alpha');

    fireEvent.keyDown(document, { key: 'j' });
    expect(card('Alpha')).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(document, { key: 'j' });
    expect(card('Beta')).toHaveAttribute('aria-selected', 'true');
    expect(card('Alpha')).toHaveAttribute('aria-selected', 'false');
    fireEvent.keyDown(document, { key: 'k' });
    expect(card('Alpha')).toHaveAttribute('aria-selected', 'true');
  });

  it('answers to the arrow keys the same way as j/k', async () => {
    render(<Harness filters={EMPTY} />);
    await screen.findByText('Alpha');

    fireEvent.keyDown(document, { key: 'ArrowDown' });
    expect(card('Alpha')).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    expect(card('Beta')).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(document, { key: 'ArrowUp' });
    expect(card('Alpha')).toHaveAttribute('aria-selected', 'true');
  });

  it('moving the selection alone never opens anything', async () => {
    render(<Harness filters={EMPTY} />);
    await screen.findByText('Alpha');
    fireEvent.keyDown(document, { key: 'j' });
    fireEvent.keyDown(document, { key: 'j' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the selected row on Enter', async () => {
    render(<Harness filters={EMPTY} />);
    await screen.findByText('Alpha');
    fireEvent.keyDown(document, { key: 'j' });
    fireEvent.keyDown(document, { key: 'Enter' });
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Alpha')).toBeInTheDocument();
  });

  it('sets a status with s/a/d on the selected row', async () => {
    render(<Harness filters={EMPTY} />);
    await screen.findByText('Alpha');
    fireEvent.keyDown(document, { key: 'j' });
    fireEvent.keyDown(document, { key: 's' });
    await waitFor(() => expect(setStatus).toHaveBeenCalledWith('a', 'saved'));
  });

  it('clears the selection on Escape', async () => {
    render(<Harness filters={EMPTY} />);
    await screen.findByText('Alpha');
    fireEvent.keyDown(document, { key: 'j' });
    expect(card('Alpha')).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(card('Alpha')).toHaveAttribute('aria-selected', 'false');
  });

  it('ignores every bound key while a text filter input has focus', async () => {
    render(
      <div>
        <input aria-label="search" />
        <PostingsView filters={EMPTY} />
      </div>,
    );
    await screen.findByText('Alpha');
    const input = screen.getByLabelText('search');
    input.focus();
    fireEvent.keyDown(input, { key: 'j' });
    expect(card('Alpha')).toHaveAttribute('aria-selected', 'false');
  });
});

describe('PostingsView triage from the row', () => {
  it('sets a status from the row action buttons without opening it', async () => {
    getPostings.mockResolvedValue([row({ id: 'a', title: 'Alpha' })]);
    render(<Harness filters={EMPTY} />);
    await screen.findByText('Alpha');

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(setStatus).toHaveBeenCalledWith('a', 'saved'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows an inline "Dismissed. Undo" on the row itself, not a floating toast', async () => {
    getPostings.mockResolvedValue([row({ id: 'a', title: 'Alpha' })]);
    render(<Harness filters={EMPTY} />);
    await screen.findByText('Alpha');

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    const flash = await screen.findByText(/Dismissed\./);
    expect(within(card('Alpha')).getByText(/Dismissed\./)).toBe(flash);
  });

  it('undoes the dismiss from the inline affordance', async () => {
    getPostings.mockResolvedValue([row({ id: 'a', title: 'Alpha' })]);
    render(<Harness filters={EMPTY} />);
    await screen.findByText('Alpha');

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    await screen.findByText(/Dismissed\./);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(setStatus).toHaveBeenLastCalledWith('a', null));
  });

  it('undoes the last status change with u', async () => {
    getPostings.mockResolvedValue([row({ id: 'a', title: 'Alpha' })]);
    render(<Harness filters={EMPTY} />);
    await screen.findByText('Alpha');

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(setStatus).toHaveBeenCalledWith('a', 'saved'));
    fireEvent.keyDown(document, { key: 'u' });
    await waitFor(() => expect(setStatus).toHaveBeenLastCalledWith('a', null));
  });
});

describe('PostingsView wide two-pane layout', () => {
  it('renders a right-hand pane instead of a dialog once something is open', async () => {
    mockWide(true);
    getPostings.mockResolvedValue([row({ id: 'a', title: 'Alpha', descriptionSnippet: 'Ship it.' })]);
    render(<Harness filters={EMPTY} />);

    fireEvent.click(await screen.findByText('Alpha'));
    await waitFor(() => expect(screen.getByText('Ship it.')).toBeInTheDocument());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // The pane is opened and closed by hand: it used to open the first row by
  // itself, which spent a column of the screen on a posting nobody asked for.
  it('shows no pane until a row is opened, and gives the width back when it closes', async () => {
    mockWide(true);
    getPostings.mockResolvedValue([row({ id: 'a', title: 'Alpha', descriptionSnippet: 'Ship it.' })]);
    render(<Harness filters={EMPTY} />);
    await screen.findByText('Alpha');
    expect(screen.queryByText('Ship it.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Alpha'));
    await waitFor(() => expect(screen.getByText('Ship it.')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('Ship it.')).not.toBeInTheDocument());
  });

  // Escape means "close what is open" before it means "drop the highlight".
  it('closes the pane on Escape', async () => {
    mockWide(true);
    getPostings.mockResolvedValue([row({ id: 'a', title: 'Alpha', descriptionSnippet: 'Ship it.' })]);
    render(<Harness filters={EMPTY} />);
    fireEvent.click(await screen.findByText('Alpha'));
    await waitFor(() => expect(screen.getByText('Ship it.')).toBeInTheDocument());
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('Ship it.')).not.toBeInTheDocument());
  });

  it('leaves the narrow layout alone: no dialog opens on its own', async () => {
    mockWide(false);
    getPostings.mockResolvedValue([row({ id: 'a', title: 'Alpha' })]);
    render(<Harness filters={EMPTY} />);
    await screen.findByText('Alpha');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('falls back to the dialog below the wide breakpoint', async () => {
    mockWide(false);
    getPostings.mockResolvedValue([row({ id: 'a', title: 'Alpha' })]);
    render(<Harness filters={EMPTY} />);
    fireEvent.click(await screen.findByText('Alpha'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

// A refresh run from the header (or the daily one) ends in a signal the feed
// reads again on, so new postings show without reloading the page.
describe('PostingsView after a refresh', () => {
  it('reads the feed again when a refresh finishes', async () => {
    render(<Harness filters={EMPTY} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalledTimes(1));
    act(() => announceRefreshed({ fresh: 3 }));
    await waitFor(() => expect(getPostings).toHaveBeenCalledTimes(2));
  });
});

describe('PostingsView setup banner', () => {
  it('says what is missing and opens Settings from there', async () => {
    getSetup.mockResolvedValueOnce([{ id: 'ai', label: 'An AI to answer with', state: 'missing', detail: 'None found.', fix: 'Install one.' }]);
    const onOpenSettings = vi.fn();
    render(<Harness filters={EMPTY} onOpenSettings={onOpenSettings} />);
    const banner = await screen.findByRole('region', { name: 'Setup' });
    fireEvent.click(within(banner).getByRole('button', { name: 'Open Settings' }));
    expect(onOpenSettings).toHaveBeenCalled();
  });
});
