import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within, act } from '@testing-library/react';
import PostingsView from './PostingsView.jsx';

vi.mock('../api.js', () => ({
  getPostings: vi.fn(async () => []),
  setStatus: vi.fn(async () => null),
}));

import { getPostings, setStatus } from '../api.js';

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

const card = (name) => screen.getByRole('button', { name: new RegExp(name) });

beforeEach(() => vi.clearAllMocks());

describe('PostingsView server-side filters', () => {
  // The feed opens personalised; the server's default is match too, but the
  // select needs to show the order the list actually has.
  it('asks for the best-fit ordering on the very first request', async () => {
    render(<PostingsView filters={EMPTY} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalled());
    expect(getPostings).toHaveBeenCalledWith(expect.objectContaining({ sort: 'match' }));
  });

  it('sends the fit floor as minFit', async () => {
    render(<PostingsView filters={{ ...EMPTY, minFit: '30' }} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalled());
    expect(getPostings).toHaveBeenCalledWith(expect.objectContaining({ minFit: '30' }));
  });

  // The whole point of fit-as-a-filter: another sort reorders the matches, it
  // does not widen the feed back out.
  it('keeps the fit floor in the request when the sort changes to newest', async () => {
    render(<PostingsView filters={{ ...EMPTY, minFit: '45' }} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText(/sort/i), { target: { value: 'newest' } });
    await waitFor(() =>
      expect(getPostings).toHaveBeenLastCalledWith(
        expect.objectContaining({ sort: 'newest', minFit: '45' }),
      ),
    );
  });

  it('sends levels comma-separated and maxDegree as query params', async () => {
    render(<PostingsView filters={{ ...EMPTY, levels: ['mid', 'staff'], maxDegree: 'masters' }} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalled());
    expect(getPostings).toHaveBeenCalledWith(
      expect.objectContaining({ levels: 'mid,staff', maxDegree: 'masters' }),
    );
  });

  it('sends the excluded sources comma-separated, never an include-list', async () => {
    render(<PostingsView filters={{ ...EMPTY, excludedSources: ['lever', 'ashby'] }} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalled());
    expect(getPostings).toHaveBeenCalledWith(expect.objectContaining({ excludedSources: 'lever,ashby' }));
    expect(getPostings.mock.calls[0][0]).not.toHaveProperty('sources');
  });

  it('sends the picked work modes comma-separated', async () => {
    render(<PostingsView filters={{ ...EMPTY, workModes: ['remote', 'hybrid'] }} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalled());
    expect(getPostings).toHaveBeenCalledWith(expect.objectContaining({ workModes: 'remote,hybrid' }));
  });

  it('sends empty strings for the unset multi-selects', async () => {
    render(<PostingsView filters={EMPTY} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalled());
    expect(getPostings).toHaveBeenCalledWith(
      expect.objectContaining({ levels: '', excludedSources: '', workModes: '' }),
    );
  });

  it('does not filter by level or work mode on the client', async () => {
    getPostings.mockResolvedValueOnce([row({ level: 'executive', workMode: 'onsite' })]);
    render(<PostingsView filters={{ ...EMPTY, levels: ['mid'], workModes: ['remote'] }} />);
    expect(await screen.findByText('Engineer')).toBeInTheDocument();
  });
});

describe('PostingsView refetch triggers', () => {
  it('refetches when a server-side field changes', async () => {
    const { rerender } = render(<PostingsView filters={EMPTY} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalledTimes(1));

    rerender(<PostingsView filters={{ ...EMPTY, levels: ['senior'] }} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalledTimes(2));

    rerender(<PostingsView filters={{ ...EMPTY, levels: ['senior'], maxDegree: 'phd' }} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalledTimes(3));
  });

  it('refetches when the exclusions or the work modes change', async () => {
    const { rerender } = render(<PostingsView filters={EMPTY} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalledTimes(1));

    rerender(<PostingsView filters={{ ...EMPTY, excludedSources: ['lever'] }} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalledTimes(2));

    rerender(<PostingsView filters={{ ...EMPTY, excludedSources: ['lever'], workModes: ['remote'] }} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalledTimes(3));
  });

  it('does not refetch when the same arrays arrive in new objects', async () => {
    const seed = { ...EMPTY, excludedSources: ['lever'], workModes: ['remote'] };
    const { rerender } = render(<PostingsView filters={seed} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalledTimes(1));

    rerender(<PostingsView filters={{ ...EMPTY, excludedSources: ['lever'], workModes: ['remote'] }} />);
    await Promise.resolve();
    expect(getPostings).toHaveBeenCalledTimes(1);
  });

  // These three used to be narrowed in the browser, which only ever filtered
  // the loaded page. They are server-side now, so each one must refetch.
  it('refetches when a measure filter changes', async () => {
    const { rerender } = render(<PostingsView filters={EMPTY} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalledTimes(1));

    rerender(<PostingsView filters={{ ...EMPTY, minStipend: '5000' }} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalledTimes(2));
    rerender(<PostingsView filters={{ ...EMPTY, minStipend: '5000', maxExp: '2' }} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalledTimes(3));
    rerender(<PostingsView filters={{ ...EMPTY, minStipend: '5000', maxExp: '2', maxMonths: '3' }} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalledTimes(4));
  });

  it('does not refetch when an identical filters object is recreated', async () => {
    const { rerender } = render(<PostingsView filters={{ ...EMPTY }} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalledTimes(1));

    rerender(<PostingsView filters={{ ...EMPTY }} />);
    await Promise.resolve();
    expect(getPostings).toHaveBeenCalledTimes(1);
  });

  it('refetches when the fit floor changes', async () => {
    const { rerender } = render(<PostingsView filters={EMPTY} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalledTimes(1));

    rerender(<PostingsView filters={{ ...EMPTY, minFit: '30' }} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalledTimes(2));
  });
});

describe('PostingsView measure filters go to the server', () => {
  it('sends the three measures as query params instead of filtering locally', async () => {
    render(<PostingsView filters={{ ...EMPTY, minStipend: '10000', maxExp: '2', maxMonths: '6' }} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalled());
    expect(getPostings).toHaveBeenLastCalledWith(expect.objectContaining({
      minStipend: '10000', maxExperienceYears: '2', maxDurationMonths: '6',
    }));
  });

  // Whatever the API returns is what the grid shows. Re-filtering here would
  // narrow only the loaded page and disagree with the "N shown" count.
  it('renders every row the server returned', async () => {
    getPostings.mockResolvedValueOnce([
      row({ id: 'a', title: 'Rich', stipend: 'Rs 20,000' }),
      row({ id: 'b', title: 'Poor', stipend: 'Rs 1,000' }),
    ]);
    render(<PostingsView filters={{ ...EMPTY, minStipend: '10000' }} />);
    expect(await screen.findByText('Rich')).toBeInTheDocument();
    expect(screen.getByText('Poor')).toBeInTheDocument();
  });
});

describe('PostingsView grid', () => {
  it('renders one card per posting', async () => {
    getPostings.mockResolvedValueOnce([
      row({ id: 'a', title: 'Alpha' }),
      row({ id: 'b', title: 'Beta' }),
      row({ id: 'c', title: 'Gamma' }),
    ]);
    render(<PostingsView filters={EMPTY} />);

    const grid = await screen.findByTestId('posting-grid');
    expect(within(grid).getAllByRole('button')).toHaveLength(3);
  });

  it('says so when nothing matches', async () => {
    render(<PostingsView filters={EMPTY} />);
    expect(await screen.findByText('Nothing matches these filters yet.')).toBeInTheDocument();
    expect(screen.queryByTestId('posting-grid')).not.toBeInTheDocument();
  });
});

describe('PostingsView best-fit ranking', () => {
  const pickSort = (value) =>
    fireEvent.change(screen.getByLabelText(/sort/i), { target: { value } });

  it('lets another sort replace the match ordering', async () => {
    getPostings.mockResolvedValue([row()]);
    render(<PostingsView filters={EMPTY} onOpenProfile={() => {}} />);
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
    render(<PostingsView filters={EMPTY} onOpenProfile={onOpenProfile} />);

    expect(await screen.findByText(/needs a profile/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Set up your profile' }));
    expect(onOpenProfile).toHaveBeenCalled();
  });

  // With no fit floor, only the best-fit order claims a ranking, so leaving
  // it takes the banner away too.
  it('drops the notice when the user leaves the best-fit order', async () => {
    getPostings.mockResolvedValue([row()]);
    render(<PostingsView filters={EMPTY} onOpenProfile={() => {}} />);
    expect(await screen.findByText(/needs a profile/i)).toBeInTheDocument();

    pickSort('newest');
    await waitFor(() => expect(screen.queryByText(/needs a profile/i)).not.toBeInTheDocument());
  });

  // The server ignores minFit when it has no profile to score against, so a
  // set floor under any sort is a claim the feed does not honour. Without the
  // banner the control would just visibly do nothing.
  it('keeps the notice under a non-match sort while a fit floor is set', async () => {
    getPostings.mockResolvedValue([row()]);
    render(<PostingsView filters={{ ...EMPTY, minFit: '30' }} onOpenProfile={() => {}} />);
    expect(await screen.findByText(/needs a profile/i)).toBeInTheDocument();

    pickSort('newest');
    expect(await screen.findByText(/needs a profile/i)).toBeInTheDocument();
    expect(screen.getByText(/fit filter/i)).toBeInTheDocument();
  });

  it('never shows the notice when the rows came back ranked, floor or not', async () => {
    getPostings.mockResolvedValue([row({ fit: 58 })]);
    render(<PostingsView filters={{ ...EMPTY, minFit: '30' }} onOpenProfile={() => {}} />);
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
    render(<PostingsView filters={{ ...EMPTY, minFit: '30' }} onOpenProfile={() => {}} />);

    expect(screen.getByText('Fetching postings...')).toBeInTheDocument();
    expect(screen.queryByText(/needs a profile/i)).not.toBeInTheDocument();

    await act(async () => deliver([row()]));
    expect(await screen.findByText(/needs a profile/i)).toBeInTheDocument();
  });

  // An empty page cannot say whether the server ranked, and the no-matches
  // copy already owns that state: a profile banner on top would fire for
  // anyone whose filters simply matched nothing.
  it('keeps the banner down when nothing matched', async () => {
    getPostings.mockResolvedValue([]);
    render(<PostingsView filters={{ ...EMPTY, minFit: '45' }} onOpenProfile={() => {}} />);

    expect(await screen.findByText('Nothing matches these filters yet.')).toBeInTheDocument();
    expect(screen.queryByText(/needs a profile/i)).not.toBeInTheDocument();
  });

  it('shows the server reasons in the overlay, not on the card', async () => {
    getPostings.mockResolvedValue([
      row({ title: 'React Engineer', fit: 58, reasons: ['matches react, typescript', 'suits your experience'] }),
    ]);
    render(<PostingsView filters={EMPTY} onOpenProfile={() => {}} />);
    expect(await screen.findByText('React Engineer')).toBeInTheDocument();

    // The card stays a scan unit; the reasons live in the overlay.
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
    render(<PostingsView filters={EMPTY} onOpenProfile={() => {}} />);
    expect(await screen.findByText('React Engineer')).toBeInTheDocument();
    pickSort('newest');
    expect(await screen.findByText('React Engineer')).toBeInTheDocument();

    fireEvent.click(card('React Engineer'));
    expect(await screen.findByText(/matches react/)).toBeInTheDocument();
  });
});

describe('PostingsView overlay', () => {
  beforeEach(() => getPostings.mockResolvedValue([row({ title: 'Engineer' })]));

  it('opens the detail overlay from a card', async () => {
    render(<PostingsView filters={EMPTY} />);
    expect(await screen.findByText('Engineer')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(card('Engineer'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Ship the thing.')).toBeInTheDocument();
  });

  it('closes on Escape and hands focus back to the card that opened it', async () => {
    render(<PostingsView filters={EMPTY} />);
    expect(await screen.findByText('Engineer')).toBeInTheDocument();

    const opener = card('Engineer');
    fireEvent.click(opener);
    expect(screen.getByRole('dialog')).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('closes on a backdrop click', async () => {
    render(<PostingsView filters={EMPTY} />);
    expect(await screen.findByText('Engineer')).toBeInTheDocument();

    fireEvent.click(card('Engineer'));
    fireEvent.click(screen.getByTestId('dialog-backdrop'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('applies a status from inside the overlay and keeps it optimistically', async () => {
    render(<PostingsView filters={EMPTY} />);
    expect(await screen.findByText('Engineer')).toBeInTheDocument();

    fireEvent.click(card('Engineer'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(setStatus).toHaveBeenCalledWith('p1', 'saved'));
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }))
      .toHaveAttribute('aria-pressed', 'true');
  });

  it('rolls the status back when the write fails', async () => {
    setStatus.mockRejectedValueOnce(new Error('offline'));
    render(<PostingsView filters={EMPTY} />);
    expect(await screen.findByText('Engineer')).toBeInTheDocument();

    fireEvent.click(card('Engineer'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }))
        .toHaveAttribute('aria-pressed', 'false'),
    );
  });
});
