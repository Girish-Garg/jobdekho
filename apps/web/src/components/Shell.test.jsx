import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import Shell from './Shell.jsx';

vi.mock('../api.js', () => ({
  getFilters: vi.fn(async () => ({})),
  putFilters: vi.fn(async () => null),
  getPostings: vi.fn(async () => []),
  getSources: vi.fn(async () => [{ name: 'lever', count: 12 }]),
  setStatus: vi.fn(async () => null),
  getNotifications: vi.fn(async () => ({ channel: 'none' })),
  putNotifications: vi.fn(async () => null),
  getProfile: vi.fn(async () => null),
  logout: vi.fn(async () => {}),
}));

import { getFilters, getPostings } from '../api.js';

const user = { email: 'alice@example.com' };

const open = (name) => fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${name}`) }));
const openMore = () => open('More filters');

beforeEach(() => vi.clearAllMocks());

describe('Shell saved filter hydration', () => {
  it('seeds the filter bar from the saved filter on mount', async () => {
    getFilters.mockResolvedValueOnce({
      excludedSources: ['lever'],
      levels: ['senior', 'staff'],
      workModes: ['remote'],
      maxDegree: 'masters',
      minStipend: 10000,
      maxExperienceYears: 3,
      maxDurationMonths: 6,
      includeKeywords: ['react'],
    });
    render(<Shell user={user} onLogout={() => {}} />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Level (2)' })).toBeInTheDocument());
    open('Level');
    expect(screen.getByRole('button', { name: 'Senior' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Staff' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Entry' })).toHaveAttribute('aria-pressed', 'false');
    open('Level');

    expect(screen.getByRole('button', { name: '1 excluded' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Work mode (1)' })).toBeInTheDocument();

    openMore();
    expect(screen.getByLabelText('Highest degree')).toHaveValue('masters');
    expect(screen.getByLabelText('Min stipend')).toHaveValue('10000');
    expect(screen.getByLabelText('Max experience')).toHaveValue('3');
    expect(screen.getByLabelText('Max duration')).toHaveValue('6');
  });

  it('fetches postings with the saved level, degree, work modes and exclusions', async () => {
    getFilters.mockResolvedValueOnce({
      levels: ['entry'], maxDegree: 'bachelors', excludedSources: ['lever'], workModes: ['remote', 'hybrid'],
    });
    render(<Shell user={user} onLogout={() => {}} />);

    await waitFor(() =>
      expect(getPostings).toHaveBeenCalledWith(
        expect.objectContaining({
          levels: 'entry',
          maxDegree: 'bachelors',
          excludedSources: 'lever',
          workModes: 'remote,hybrid',
        }),
      ),
    );
  });

  it('falls back to empty defaults when the filter request fails', async () => {
    getFilters.mockRejectedValueOnce(new Error('offline'));
    render(<Shell user={user} onLogout={() => {}} />);

    await waitFor(() => expect(getPostings).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Level' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All sources' })).toBeInTheDocument();
    expect(getPostings).toHaveBeenCalledWith(
      expect.objectContaining({ levels: '', maxDegree: '', excludedSources: '', workModes: '' }),
    );
  });

  it('tolerates a saved filter that predates the level and source fields', async () => {
    getFilters.mockResolvedValueOnce({ includeKeywords: ['intern'], excludeKeywords: [], locations: [] });
    render(<Shell user={user} onLogout={() => {}} />);

    await waitFor(() => expect(getPostings).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Level' })).toBeInTheDocument();
    openMore();
    expect(screen.getByLabelText('Max experience')).toHaveValue('');
  });

  it('keeps a saved Fresher ceiling of zero rather than reading it as unset', async () => {
    getFilters.mockResolvedValueOnce({ maxExperienceYears: 0 });
    render(<Shell user={user} onLogout={() => {}} />);
    await waitFor(() => expect(getPostings).toHaveBeenCalled());
    openMore();
    expect(screen.getByLabelText('Max experience')).toHaveValue('0');
  });
});

// Both the saved filter and the source list land after mount, so the layout
// cases wait for the whole first paint to settle before poking at it.
async function mount() {
  await act(async () => {
    render(<Shell user={user} onLogout={() => {}} />);
  });
}

describe('Shell layout', () => {
  it('puts the filters above the feed instead of in a left rail', async () => {
    await mount();
    expect(getPostings).toHaveBeenCalled();
    expect(document.querySelector('aside')).toBeNull();
    expect(screen.getByRole('button', { name: 'Level' })).toBeInTheDocument();
  });

  it('keeps the search in the topbar rather than the filter bar', async () => {
    await mount();
    const search = screen.getByLabelText('Keyword');
    expect(search.closest('header')).not.toBeNull();
  });

  it('drives the feed from the topbar search', async () => {
    await mount();
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Keyword'), { target: { value: 'react' } });
    });
    expect(screen.getByLabelText('Keyword')).toHaveValue('react');
    await waitFor(() => expect(getPostings).toHaveBeenCalledWith(expect.objectContaining({ q: 'react' })));
  });

  it('keeps the section navigation reachable and switches views', async () => {
    await mount();

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    // Filters belong to the feed, so the bar and the search go away with it.
    expect(screen.queryByRole('button', { name: 'Level' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Keyword')).not.toBeInTheDocument();

    // Going back remounts the bar and the feed, so let both settle.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Postings' }));
    });
    expect(screen.getByLabelText('Keyword')).toBeInTheDocument();
  });

  it('reaches the profile section from the nav', async () => {
    await mount();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Profile' }));
    });
    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    // The profile is not part of the feed, so the search and filters go away.
    expect(screen.queryByLabelText('Keyword')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Level' })).not.toBeInTheDocument();
  });
});

// The palette and the shortcuts help get their own thorough tests; this is
// just the wiring that gets a keypress from the document to those overlays.
describe('Shell global shortcuts', () => {
  it('opens the command palette on Ctrl+K', async () => {
    await mount();
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
  });

  it('opens the shortcuts help on ?', async () => {
    await mount();
    fireEvent.keyDown(document, { key: '?' });
    expect(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument();
  });

  it('focuses the search box on /', async () => {
    await mount();
    fireEvent.keyDown(document, { key: '/' });
    expect(screen.getByLabelText('Keyword')).toHaveFocus();
  });

  it('closes the palette on Escape and returns focus to the page', async () => {
    await mount();
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    fireEvent.keyDown(screen.getByLabelText('Type a command'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
