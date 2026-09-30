import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import RefreshSettingsCard from './RefreshSettingsCard.jsx';
import RefreshLastRun from './RefreshLastRun.jsx';

vi.mock('../api.js', () => ({
  getScrapeState: vi.fn(),
  startScrape: vi.fn(),
  getScrapeSettings: vi.fn(),
  putScrapeSettings: vi.fn(),
}));

import { getScrapeState, startScrape, getScrapeSettings, putScrapeSettings } from '../api.js';

const failure = (name, error = 'HTTP 404') => ({ name, error });
const LAST = { at: '2026-09-30T08:35:00.000Z', fresh: 37, sources: 118, failed: [failure('greenhouse:acme'), failure('linkedin', 'HTTP 429')] };
const IDLE = { running: false, startedAt: null, finishedAt: null, done: 0, total: 0, lastRun: LAST };

beforeEach(() => {
  vi.clearAllMocks();
  getScrapeState.mockResolvedValue(IDLE);
  getScrapeSettings.mockResolvedValue({ autoRefresh: true });
  putScrapeSettings.mockResolvedValue(null);
});

async function mount() {
  await act(async () => {
    render(<RefreshSettingsCard />);
  });
  await waitFor(() => expect(screen.getByRole('switch')).toBeEnabled());
}

describe('RefreshSettingsCard', () => {
  it('is the Postings card, with the daily refresh switched on by default', async () => {
    await mount();
    expect(screen.getByRole('heading', { level: 3, name: 'Postings' })).toBeInTheDocument();
    const toggle = screen.getByRole('switch', { name: 'Refresh once a day on its own' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('shows the switch as saved, off', async () => {
    getScrapeSettings.mockResolvedValue({ autoRefresh: false });
    await mount();
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('saves the switch the moment it is flipped', async () => {
    await mount();
    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument());
    expect(putScrapeSettings).toHaveBeenCalledWith({ autoRefresh: false });
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('shows the last run and the sources it could not reach', async () => {
    await mount();
    await waitFor(() => expect(screen.getByText(/: 37 new from 118 sources/)).toBeInTheDocument());
    expect(screen.getByText(/2 could not be reached/)).toBeInTheDocument();
    expect(screen.getByText('Acme')).toHaveAttribute('title', 'HTTP 404');
  });

  it('refreshes on demand, and cannot be pressed again while that runs', async () => {
    await mount();
    startScrape.mockResolvedValue({ ...IDLE, running: true, done: 0, total: 118 });
    getScrapeState.mockResolvedValue({ ...IDLE, running: true, done: 12, total: 118 });
    fireEvent.click(screen.getByRole('button', { name: 'Refresh now' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh now' })).toBeDisabled());
    expect(startScrape).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText('Refreshing: 12 of 118 sources')).toBeInTheDocument());
  });
});

describe('RefreshLastRun', () => {
  it('says when no refresh has run yet', () => {
    render(<RefreshLastRun lastRun={null} />);
    expect(screen.getByText('No refresh has run yet.')).toBeInTheDocument();
  });

  it('names a few of the sources it missed and counts the rest', () => {
    const failed = ['a', 'b', 'c', 'd', 'e', 'f'].map((n) => failure(`lever:${n}`));
    render(<RefreshLastRun lastRun={{ ...LAST, failed }} />);
    const line = screen.getByText(/6 could not be reached/).closest('p');
    expect(line).toHaveTextContent('6 could not be reached: A, B, C, D and 2 more');
  });

  it('leaves the failures out entirely when every source answered', () => {
    render(<RefreshLastRun lastRun={{ ...LAST, failed: [] }} />);
    expect(screen.queryByText(/could not be reached/)).not.toBeInTheDocument();
  });
});
