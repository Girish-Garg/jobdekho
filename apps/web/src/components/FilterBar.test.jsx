import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import FilterBar from './FilterBar.jsx';
import { EMPTY_FILTERS } from '../lib/savedFilters.js';
import { onNotice } from '../lib/toast.js';

vi.mock('../api.js', () => ({
  getSources: vi.fn(async () => [
    { name: 'internshala', count: 878 },
    { name: 'lever', count: 205 },
  ]),
}));

import { getSources } from '../api.js';

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
    for (const name of [/^Level$/, /^Status$/, /^Work mode$/, /^All sources$/, /^More filters$/]) {
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

// The feed runs strong fits first under every sort (see lib/sorts.js), so a
// floor to hide the weak ones had nothing left to do and the Fit trigger went.
// A floor the chat sets still shows, as a chip, and still comes off there.
describe('FilterBar fit floor', () => {
  it('has no Fit trigger in the bar', async () => {
    await setup();
    expect(screen.queryByRole('button', { name: /^Fit/ })).toBeNull();
  });

  it('surfaces the floor as a chip in grade words and removes it from there', async () => {
    const { setFilters } = await setup({ minFit: '40' });
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

// Saving the filters as the default is offered where the filters are, once
// the ones on screen would open JobDekho differently: a button at the foot
// of More filters was easy to forget (see SaveFiltersButton.jsx).
describe('Save as default', () => {
  const saved = { ...EMPTY_FILTERS, levels: ['entry'] };
  const showing = async (filters, defaults) => {
    await act(async () => {
      render(<FilterBar filters={{ ...EMPTY_FILTERS, ...filters }} setFilters={vi.fn()} defaults={defaults} />);
    });
  };
  const offer = () => screen.queryByRole('button', { name: 'Save as default' });

  it('is not offered while the filters are the saved ones, in any order', async () => {
    await showing({ levels: ['entry'] }, { saved, save: vi.fn() });
    expect(offer()).not.toBeInTheDocument();
  });

  it('is offered once a kept filter differs, and saves the filters on screen', async () => {
    const save = vi.fn(async () => {});
    const notices = [];
    const off = onNotice((notice) => notices.push(notice));
    await showing({ levels: ['entry', 'mid'] }, { saved, save });
    fireEvent.click(offer());
    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ levels: ['entry', 'mid'] })));
    await waitFor(() => expect(notices.at(-1)).toMatchObject({ kind: 'done', title: 'Filters saved' }));
    off();
  });

  // The search, companies, status and fit floor are for this visit, so
  // saving them would keep nothing: no offer for those alone.
  it('is not offered for what is kept for this visit only', async () => {
    await showing({ levels: ['entry'], q: 'react', companies: ['Acme'], status: 'saved' }, { saved, save: vi.fn() });
    expect(screen.getByRole('button', { name: 'Clear all' })).toBeInTheDocument();
    expect(offer()).not.toBeInTheDocument();
  });

  // Clearing every filter is a change too: the bare feed can be the default.
  it('stands alone once every chip is gone', async () => {
    await showing({}, { saved, save: vi.fn() });
    expect(offer()).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument();
  });

  it('waits to know the saved filters before offering anything', async () => {
    await showing({ levels: ['mid'] }, { saved: null, save: vi.fn() });
    expect(offer()).not.toBeInTheDocument();
  });

  it('says so when the save fails, and stays to try again', async () => {
    const notices = [];
    const off = onNotice((notice) => notices.push(notice));
    await showing({ levels: ['mid'] }, { saved, save: vi.fn(async () => { throw new Error('boom'); }) });
    fireEvent.click(offer());
    await waitFor(() => expect(notices.at(-1)).toMatchObject({ kind: 'error', title: 'Could not save the filters', detail: 'boom' }));
    expect(offer()).toBeInTheDocument();
    off();
  });

  it('is no longer at the foot of More filters', async () => {
    await setup();
    openMore();
    expect(screen.queryByRole('button', { name: /Save as/ })).not.toBeInTheDocument();
  });
});
