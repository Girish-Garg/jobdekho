import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import PostingsView from './PostingsView.jsx';

vi.mock('../api.js', () => ({
  getPostings: vi.fn(async () => []),
  setStatus: vi.fn(async () => null),
  getProfile: vi.fn(async () => null),
}));

import { getPostings, setStatus, getProfile } from '../api.js';

const EMPTY = {
  excludedSources: [], levels: [], workModes: [], q: '', status: '',
  maxDegree: '', minStipend: '', maxMonths: '', maxExp: '',
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

describe('PostingsView recommended sort', () => {
  const PROFILE = {
    skills: ['react'], titles: [], locations: [], years: 1, degree: 'none', resumeName: null,
  };
  const pickRecommended = () =>
    fireEvent.change(screen.getByLabelText(/sort/i), { target: { value: 'match' } });

  it('asks the server for the match ordering', async () => {
    getPostings.mockResolvedValue([row()]);
    render(<PostingsView filters={EMPTY} onOpenProfile={() => {}} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalledTimes(1));
    pickRecommended();
    await waitFor(() =>
      expect(getPostings).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'match' })),
    );
  });

  // The server quietly falls back to newest ordering with no profile, so the
  // UI is the only place that can say the list is not really ranked.
  it('says so when there is no profile, and points at the profile section', async () => {
    getPostings.mockResolvedValue([row()]);
    const onOpenProfile = vi.fn();
    render(<PostingsView filters={EMPTY} onOpenProfile={onOpenProfile} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalled());
    pickRecommended();

    expect(await screen.findByText(/needs a profile/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Set up your profile' }));
    expect(onOpenProfile).toHaveBeenCalled();
  });

  it('never fetches the profile or shows the notice on other sorts', async () => {
    render(<PostingsView filters={EMPTY} onOpenProfile={() => {}} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalled());
    expect(getProfile).not.toHaveBeenCalled();
    expect(screen.queryByText(/needs a profile/i)).not.toBeInTheDocument();
  });

  it('shows the match reasons in the overlay, not on the card', async () => {
    getProfile.mockResolvedValue(PROFILE);
    getPostings.mockResolvedValue([row({ title: 'React Engineer', level: 'entry' })]);
    render(<PostingsView filters={EMPTY} onOpenProfile={() => {}} />);
    expect(await screen.findByText('React Engineer')).toBeInTheDocument();
    pickRecommended();
    expect(await screen.findByText('React Engineer')).toBeInTheDocument();
    await waitFor(() => expect(getProfile).toHaveBeenCalled());

    // The card stays a scan unit; the reasons live in the overlay.
    expect(screen.queryByText(/matches react/)).not.toBeInTheDocument();
    fireEvent.click(card('React Engineer'));
    expect(await screen.findByText(/matches react/)).toBeInTheDocument();
    expect(screen.getByText(/suits your experience/)).toBeInTheDocument();
  });

  it('keeps the reasons out of the overlay on other sorts', async () => {
    getProfile.mockResolvedValue(PROFILE);
    getPostings.mockResolvedValue([row({ title: 'React Engineer', level: 'entry' })]);
    render(<PostingsView filters={EMPTY} onOpenProfile={() => {}} />);
    expect(await screen.findByText('React Engineer')).toBeInTheDocument();

    fireEvent.click(card('React Engineer'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByText(/matches react/)).not.toBeInTheDocument();
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
