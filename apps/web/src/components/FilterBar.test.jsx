import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import FilterBar from './FilterBar.jsx';
import { EMPTY_FILTERS } from '../lib/savedFilters.js';

vi.mock('../api.js', () => ({
  getFilters: vi.fn(async () => ({ includeKeywords: ['react'], excludeKeywords: [], locations: [] })),
  putFilters: vi.fn(async () => null),
  getSources: vi.fn(async () => [
    { name: 'internshala', count: 878 },
    { name: 'lever', count: 205 },
  ]),
}));

import { getFilters, putFilters, getSources } from '../api.js';

// The bar loads its source list on mount, so every case flushes that fetch
// before asserting rather than racing it.
async function setup(overrides = {}) {
  const setFilters = vi.fn();
  const filters = { ...EMPTY_FILTERS, ...overrides };
  await act(async () => {
    render(<FilterBar filters={filters} setFilters={setFilters} />);
  });
  return { setFilters, filters };
}

const open = (name) => fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${name}`) }));
const openMore = () => open('More filters');

beforeEach(() => vi.clearAllMocks());

describe('FilterBar row', () => {
  it('collapses every control into a single row of triggers', async () => {
    await setup();
    for (const name of [/^Fit$/, /^Level$/, /^Status$/, /^Work mode$/, /^All sources$/, /^More filters$/]) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-expanded', 'false');
    }
  });

  it('keeps the pill rows out of the bar until their trigger is used', async () => {
    await setup();
    expect(screen.queryByRole('button', { name: 'Senior' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Applied' })).not.toBeInTheDocument();
    open('Level');
    expect(screen.getByRole('button', { name: 'Senior' })).toBeInTheDocument();
  });

  it('no longer carries the keyword input, which moved to the topbar', async () => {
    await setup();
    expect(screen.queryByLabelText('Keyword')).not.toBeInTheDocument();
  });

  it('counts the active picks on each closed trigger', async () => {
    await setup({ levels: ['mid', 'senior'], status: 'applied', workModes: ['remote'] });
    expect(screen.getByRole('button', { name: 'Level (2)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Status (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Work mode (1)' })).toBeInTheDocument();
  });
});

describe('FilterBar level filter', () => {
  it('offers every level in the ladder', async () => {
    await setup();
    open('Level');
    for (const label of ['Internship', 'Entry', 'Mid', 'Senior', 'Staff', 'Executive']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('adds a level to the array on click', async () => {
    const { setFilters } = await setup();
    open('Level');
    fireEvent.click(screen.getByRole('button', { name: 'Senior' }));
    expect(setFilters).toHaveBeenCalledWith(expect.objectContaining({ levels: ['senior'] }));
  });

  it('appends rather than replaces when a level is already picked', async () => {
    const { setFilters } = await setup({ levels: ['entry'] });
    open('Level');
    fireEvent.click(screen.getByRole('button', { name: 'Staff' }));
    expect(setFilters).toHaveBeenCalledWith(expect.objectContaining({ levels: ['entry', 'staff'] }));
  });

  it('removes a level when clicked again', async () => {
    const { setFilters } = await setup({ levels: ['entry', 'mid'] });
    open('Level');
    fireEvent.click(screen.getByRole('button', { name: 'Entry' }));
    expect(setFilters).toHaveBeenCalledWith(expect.objectContaining({ levels: ['mid'] }));
  });

  it('marks the selected levels as pressed', async () => {
    await setup({ levels: ['mid'] });
    open('Level');
    expect(screen.getByRole('button', { name: 'Mid' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Senior' })).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('FilterBar work mode filter', () => {
  it('offers the three modes, multi-select', async () => {
    const { setFilters } = await setup({ workModes: ['remote'] });
    open('Work mode');
    for (const label of ['Remote', 'Hybrid', 'Onsite']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Remote' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Hybrid' }));
    expect(setFilters).toHaveBeenCalledWith(expect.objectContaining({ workModes: ['remote', 'hybrid'] }));
  });

  it('unticks a mode on a second click', async () => {
    const { setFilters } = await setup({ workModes: ['remote', 'onsite'] });
    open('Work mode');
    fireEvent.click(screen.getByRole('button', { name: 'Onsite' }));
    expect(setFilters).toHaveBeenCalledWith(expect.objectContaining({ workModes: ['remote'] }));
  });
});

describe('FilterBar fit filter', () => {
  it('keeps the grades behind the trigger, unset by default', async () => {
    await setup();
    expect(screen.queryByRole('button', { name: 'A' })).not.toBeInTheDocument();
    open('Fit');
    expect(screen.getByRole('button', { name: 'Any' })).toHaveAttribute('aria-pressed', 'true');
    for (const grade of ['A', 'B', 'C', 'D']) expect(screen.getByRole('button', { name: grade })).toBeInTheDocument();
  });

  // Each grade is a floor: B shows the B jobs and the A ones.
  it('writes the picked grade as its lower bound', async () => {
    const { setFilters } = await setup();
    open('Fit');
    fireEvent.click(screen.getByRole('button', { name: 'B' }));
    expect(setFilters).toHaveBeenCalledWith(expect.objectContaining({ minFit: '50' }));
    fireEvent.click(screen.getByRole('button', { name: 'D' }));
    expect(setFilters).toHaveBeenCalledWith(expect.objectContaining({ minFit: '25' }));
  });

  // A second floor would just shadow the first, so the pick replaces like
  // Status rather than stacking like Level.
  it('replaces rather than stacks the floor', async () => {
    const { setFilters } = await setup({ minFit: '50' });
    open('Fit');
    expect(screen.getByRole('button', { name: 'B' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    expect(setFilters).toHaveBeenCalledWith(expect.objectContaining({ minFit: '62' }));
  });

  it('counts an active floor on the closed trigger', async () => {
    await setup({ minFit: '62' });
    expect(screen.getByRole('button', { name: 'Fit (1)' })).toBeInTheDocument();
  });

  it('surfaces the floor as a chip in grade words and removes it from there', async () => {
    const { setFilters } = await setup({ minFit: '50' });
    expect(screen.getByText('Grade B or better')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Grade B or better filter' }));
    expect(setFilters).toHaveBeenCalledWith(expect.objectContaining({ minFit: '' }));
  });
});

describe('FilterBar status filter', () => {
  it('replaces rather than toggles the single-select status', async () => {
    const { setFilters } = await setup({ status: 'saved' });
    open('Status');
    fireEvent.click(screen.getByRole('button', { name: 'New' }));
    expect(setFilters).toHaveBeenCalledWith(expect.objectContaining({ status: 'new' }));
  });
});

describe('FilterBar source exclusions', () => {
  it('loads the source list with its counts, every board ticked', async () => {
    await setup();
    await waitFor(() => expect(getSources).toHaveBeenCalled());
    open('All sources');
    expect(await screen.findByRole('checkbox', { name: /internshala/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /lever/i })).toBeChecked();
    expect(screen.getByText('878')).toBeInTheDocument();
  });

  it('writes an unticked board to excludedSources', async () => {
    const { setFilters } = await setup();
    await waitFor(() => expect(getSources).toHaveBeenCalled());
    open('All sources');
    fireEvent.click(await screen.findByRole('checkbox', { name: /lever/i }));
    expect(setFilters).toHaveBeenCalledWith(expect.objectContaining({ excludedSources: ['lever'] }));
  });

  it('re-includes everything from Reset', async () => {
    const { setFilters } = await setup({ excludedSources: ['lever', 'internshala'] });
    await waitFor(() => expect(getSources).toHaveBeenCalled());
    open('2 excluded');
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(setFilters).toHaveBeenCalledWith(expect.objectContaining({ excludedSources: [] }));
  });

  it('survives an unreachable source endpoint', async () => {
    getSources.mockRejectedValueOnce(new Error('offline'));
    await setup();
    await waitFor(() => expect(getSources).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'All sources' })).toBeInTheDocument();
  });
});

describe('FilterBar active chips', () => {
  it('stays hidden while nothing is filtered', async () => {
    await setup();
    expect(screen.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument();
  });

  it('shows what is active even with every dropdown closed', async () => {
    await setup({ levels: ['senior'], workModes: ['remote'], minStipend: '10000', excludedSources: ['a', 'b', 'c'] });
    for (const label of ['Senior', 'Remote', '₹10,000+ /mo', '3 sources excluded']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('names each remove control rather than leaving a bare glyph', async () => {
    await setup({ levels: ['senior'] });
    expect(screen.getByRole('button', { name: 'Remove Senior filter' })).toBeInTheDocument();
  });

  it('removes only the chip that was clicked', async () => {
    const { setFilters } = await setup({ levels: ['senior', 'mid'], status: 'applied' });
    fireEvent.click(screen.getByRole('button', { name: 'Remove Senior filter' }));
    expect(setFilters).toHaveBeenCalledWith(expect.objectContaining({ levels: ['mid'], status: 'applied' }));
  });

  it('drops the whole exclude list from its chip', async () => {
    const { setFilters } = await setup({ excludedSources: ['lever', 'ashby'] });
    fireEvent.click(screen.getByRole('button', { name: 'Remove source exclusions filter' }));
    expect(setFilters).toHaveBeenCalledWith(expect.objectContaining({ excludedSources: [] }));
  });

  it('resets every field from Clear all', async () => {
    const { setFilters } = await setup({ q: 'react', levels: ['senior'], workModes: ['remote'], maxExp: '2' });
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(setFilters).toHaveBeenCalledWith(EMPTY_FILTERS);
  });
});

describe('FilterBar More filters disclosure', () => {
  it('keeps the rarely used ceilings collapsed by default', async () => {
    await setup();
    expect(screen.queryByLabelText('Pay, at least')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'More filters' })).toHaveAttribute('aria-expanded', 'false');
  });

  // Pay and experience are sliders over the known steps, so a move reports
  // the step's value, never a free number the chat could not also set.
  it('sets pay and experience from their sliders, by step', async () => {
    const { setFilters } = await setup();
    openMore();
    fireEvent.change(screen.getByLabelText('Pay, at least'), { target: { value: '3' } });
    expect(setFilters).toHaveBeenCalledWith(expect.objectContaining({ minStipend: '10000' }));
    fireEvent.change(screen.getByLabelText('Experience asked, at most'), { target: { value: '0' } });
    expect(setFilters).toHaveBeenCalledWith(expect.objectContaining({ maxExp: '0' }));
    fireEvent.change(screen.getByLabelText('Experience asked, at most'), { target: { value: '2' } });
    expect(setFilters).toHaveBeenCalledWith(expect.objectContaining({ maxExp: '2' }));
  });

  it('reads the current step in words on each slider, Any at the open end', async () => {
    await setup({ minStipend: '25000' });
    openMore();
    expect(screen.getByLabelText('Pay, at least')).toHaveAttribute('aria-valuetext', '₹25,000+ /mo (3 LPA)');
    expect(screen.getByLabelText('Experience asked, at most')).toHaveAttribute('aria-valuetext', 'Any');
  });

  it('sets the length and the degree from their pills', async () => {
    const { setFilters } = await setup();
    openMore();
    fireEvent.click(within(screen.getByRole('group', { name: 'Your highest degree' })).getByRole('button', { name: "Master's" }));
    expect(setFilters).toHaveBeenCalledWith(expect.objectContaining({ maxDegree: 'masters' }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Internship length, at most' })).getByRole('button', { name: '3 months' }));
    expect(setFilters).toHaveBeenCalledWith(expect.objectContaining({ maxMonths: '3' }));
  });

  it('collapses again on a second click', async () => {
    await setup();
    openMore();
    expect(screen.getByLabelText('Pay, at least')).toBeInTheDocument();
    openMore();
    expect(screen.queryByLabelText('Pay, at least')).not.toBeInTheDocument();
  });

  // Filters you cannot see still change the feed, so the trigger has to say
  // how many are active.
  it('counts the hidden filters on the trigger', async () => {
    await setup({ maxDegree: 'phd', minStipend: '5000' });
    expect(screen.getByRole('button', { name: 'More filters (2)' })).toBeInTheDocument();
  });
});

describe('Save as my default', () => {
  it('says the saved filters are what JobDekho opens with, with no sign-in to speak of', async () => {
    await setup();
    openMore();
    expect(screen.getByText('Open JobDekho with these filters every time.')).toBeInTheDocument();
    expect(screen.queryByText(/sign in/)).not.toBeInTheDocument();
  });

  it('PUTs the filters under the persisted field names', async () => {
    await setup({
      excludedSources: ['lever'],
      levels: ['mid', 'senior'],
      workModes: ['remote'],
      maxDegree: 'bachelors',
      minStipend: '5000',
      maxExp: '2',
      maxMonths: '6',
    });
    openMore();
    fireEvent.click(screen.getByRole('button', { name: 'Save as my default' }));

    await waitFor(() => expect(putFilters).toHaveBeenCalled());
    expect(putFilters).toHaveBeenCalledWith(
      expect.objectContaining({
        excludedSources: ['lever'],
        levels: ['mid', 'senior'],
        workModes: ['remote'],
        maxDegree: 'bachelors',
        minStipend: 5000,
        maxExperienceYears: 2,
        maxDurationMonths: 6,
      }),
    );
  });

  it('carries the keyword filters through so a bar save does not wipe them', async () => {
    await setup({ levels: ['entry'] });
    openMore();
    fireEvent.click(screen.getByRole('button', { name: 'Save as my default' }));

    await waitFor(() => expect(putFilters).toHaveBeenCalled());
    expect(getFilters).toHaveBeenCalled();
    expect(putFilters).toHaveBeenCalledWith(expect.objectContaining({ includeKeywords: ['react'] }));
  });

  it('confirms on success', async () => {
    await setup();
    openMore();
    expect(screen.queryByRole('button', { name: 'Saved' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save as my default' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Saved' })).toBeInTheDocument());
  });

  it('shows an error state when the save fails', async () => {
    putFilters.mockRejectedValueOnce(new Error('boom'));
    await setup();
    openMore();
    fireEvent.click(screen.getByRole('button', { name: 'Save as my default' }));
    expect(await screen.findByText('Could not save.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
