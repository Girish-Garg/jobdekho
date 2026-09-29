import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react';
import Shell from './Shell.jsx';
import { askAboutPosting } from '../lib/askAiSignal.js';

vi.mock('../api.js', () => ({
  getFilters: vi.fn(async () => ({})),
  putFilters: vi.fn(async () => null),
  getPostings: vi.fn(async () => []),
  getSources: vi.fn(async () => [{ name: 'lever', count: 12 }]),
  setStatus: vi.fn(async () => null),
  getNotifications: vi.fn(async () => ({ channel: 'none' })),
  putNotifications: vi.fn(async () => null),
  getProfile: vi.fn(async () => null),
  getProviders: vi.fn(async () => []),
  getProviderPreference: vi.fn(async () => ({ provider: 'auto' })),
  putProviderPreference: vi.fn(async () => null),
  getChatHistory: vi.fn(async () => ({ turns: [] })),
  getPostingAiResults: vi.fn(async () => []),
  runPostingAction: vi.fn(() => new Promise(() => {})),
}));

import { getFilters, getPostings, getProviders, getPostingAiResults, runPostingAction } from '../api.js';

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
    render(<Shell />);

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
    render(<Shell />);

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
    render(<Shell />);

    await waitFor(() => expect(getPostings).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Level' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All sources' })).toBeInTheDocument();
    expect(getPostings).toHaveBeenCalledWith(
      expect.objectContaining({ levels: '', maxDegree: '', excludedSources: '', workModes: '' }),
    );
  });

  it('tolerates a saved filter that predates the level and source fields', async () => {
    getFilters.mockResolvedValueOnce({ includeKeywords: ['intern'], excludeKeywords: [], locations: [] });
    render(<Shell />);

    await waitFor(() => expect(getPostings).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Level' })).toBeInTheDocument();
    openMore();
    expect(screen.getByLabelText('Max experience')).toHaveValue('');
  });

  it('keeps a saved Fresher ceiling of zero rather than reading it as unset', async () => {
    getFilters.mockResolvedValueOnce({ maxExperienceYears: 0 });
    render(<Shell />);
    await waitFor(() => expect(getPostings).toHaveBeenCalled());
    openMore();
    expect(screen.getByLabelText('Max experience')).toHaveValue('0');
  });
});

// Both the saved filter and the source list land after mount, so the layout
// cases wait for the whole first paint to settle before poking at it.
async function mount() {
  await act(async () => {
    render(<Shell />);
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

// The sort and the density toggle ride the filter row, not a band of their
// own: three bands of chrome before the first job was the whole complaint.
it('keeps the sort and the density toggle in the filter row', async () => {
  render(<Shell />);
  await screen.findByRole('button', { name: 'Level' });
  // The same panel holds the filters and both controls, rather than a second
  // bar underneath holding the count, the sort and the density toggle.
  const panel = screen.getByLabelText('Sort').closest('.bg-panel');
  expect(panel.contains(screen.getByRole('button', { name: 'More filters' }))).toBe(true);
  expect(panel.contains(screen.getByRole('button', { name: 'Cards' }))).toBe(true);
});


// The job pane's "Ask AI about this job" is what opens the chat, so the
// person never has to find the chat first.
describe('Shell and the chat', () => {
  const JOB = { id: 'p9', title: 'Staff Engineer', company: 'Initech', legitimacy: 'suspicious' };

  it('opens the chat on the job the pane asked about, with the asked action started', async () => {
    getProviders.mockResolvedValue([{ id: 'claude', label: 'Claude Code', policies: ['none', 'web'], present: true, runs: true }]);
    await mount();
    expect(screen.queryByRole('complementary', { name: 'Ask AI' })).not.toBeInTheDocument();
    await act(async () => askAboutPosting(JOB, 'fake-check'));
    expect(screen.getByRole('complementary', { name: 'Ask AI' })).toBeInTheDocument();
    expect(screen.getByText('Staff Engineer')).toBeInTheDocument();
    await waitFor(() => expect(getPostingAiResults).toHaveBeenCalledWith('p9'));
    await waitFor(() => expect(runPostingAction).toHaveBeenCalledWith('p9', 'fake-check', expect.anything()));
    expect(within(screen.getByRole('banner')).getByRole('button', { name: 'Ask AI' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('offers the chat on every page, and keeps it open across them', async () => {
    await mount();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Profile' })));
    await act(async () => fireEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: 'Ask AI' })));
    const chat = screen.getByRole('complementary', { name: 'Ask AI' });
    expect(await within(chat).findByRole('heading', { name: 'Ask about your profile' })).toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Settings' })));
    expect(screen.getByRole('complementary', { name: 'Ask AI' })).toBe(chat);
    expect(within(chat).getByRole('heading', { name: 'Ask about JobDekho' })).toBeInTheDocument();
  });

  it('closes from the topbar like any other time', async () => {
    getProviders.mockResolvedValue([]);
    await mount();
    await act(async () => askAboutPosting(JOB));
    fireEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: 'Ask AI' }));
    expect(screen.queryByRole('complementary', { name: 'Ask AI' })).not.toBeInTheDocument();
  });
});
