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
  getScrapeSettings.mockResolvedValue({ autoRefresh: true, linkedin: true });
  putScrapeSettings.mockResolvedValue(null);
});

const daily = () => screen.getByRole('switch', { name: 'Refresh once a day on its own' });
const linkedin = () => screen.getByRole('switch', { name: 'Include LinkedIn' });

async function mount() {
  await act(async () => {
    render(<RefreshSettingsCard />);
  });
  await waitFor(() => expect(daily()).toBeEnabled());
}

describe('RefreshSettingsCard', () => {
  it('is the Postings card, with the daily refresh switched on by default', async () => {
    await mount();
    expect(screen.getByRole('heading', { level: 3, name: 'Postings' })).toBeInTheDocument();
    expect(daily()).toHaveAttribute('aria-checked', 'true');
  });

  it('shows the switch as saved, off', async () => {
    getScrapeSettings.mockResolvedValue({ autoRefresh: false, linkedin: true });
    await mount();
    expect(daily()).toHaveAttribute('aria-checked', 'false');
  });

  it('saves the switch the moment it is flipped', async () => {
    await mount();
    fireEvent.click(daily());
    await waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument());
    expect(putScrapeSettings).toHaveBeenCalledWith({ autoRefresh: false });
    expect(daily()).toHaveAttribute('aria-checked', 'false');
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

describe('Include LinkedIn', () => {
  const HOUR = 60 * 60 * 1000;
  const at = (ms) => new Date(ms).toISOString();

  // The server's default (see the scraper's linkedin-setting.js): a fresh
  // install never reads LinkedIn until the person turns it on.
  it('is off by default, and says plainly what reading LinkedIn risks', async () => {
    getScrapeSettings.mockResolvedValue({ autoRefresh: true, linkedin: false });
    await mount();
    expect(linkedin()).toHaveAttribute('aria-checked', 'false');
    expect(linkedin()).toHaveAccessibleDescription(/^Off unless you turn it on, since LinkedIn does not allow automated access\..*at most once a day.*pauses for days/);
    expect(screen.getByText('Off')).toBeInTheDocument();
  });

  it('saves the switch the moment it is flipped, and then says Off', async () => {
    await mount();
    fireEvent.click(linkedin());
    await waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument());
    expect(putScrapeSettings).toHaveBeenCalledWith({ linkedin: false });
    expect(linkedin()).toHaveAttribute('aria-checked', 'false');
    expect(daily()).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Off')).toBeInTheDocument();
  });

  it('shows the switch as saved, off', async () => {
    getScrapeSettings.mockResolvedValue({ autoRefresh: true, linkedin: false });
    await mount();
    expect(linkedin()).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText('Off')).toBeInTheDocument();
  });

  it('says when LinkedIn was read and when it can be again', async () => {
    const now = Date.now();
    getScrapeState.mockResolvedValue({ ...IDLE, linkedin: { lastSweepAt: at(now - 5 * HOUR), pausedUntil: null, nextAfter: at(now + 15 * HOUR) } });
    await mount();
    await waitFor(() => expect(screen.getByText('Read 5 h ago, next after 15 h')).toHaveClass('text-muted'));
  });

  it('says LinkedIn is paused, and until when, after it refused', async () => {
    const until = new Date(Date.now() + 2 * 24 * HOUR);
    getScrapeState.mockResolvedValue({ ...IDLE, linkedin: { lastSweepAt: at(Date.now()), pausedUntil: until.toISOString(), nextAfter: until.toISOString() } });
    await mount();
    const line = await screen.findByText(/^Paused until \w{3} \d{1,2} \w{3}: LinkedIn refused the last read$/);
    expect(line).toHaveTextContent(String(until.getDate()));
    expect(line).toHaveClass('text-ember');
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

  // Skipping LinkedIn is the guard working: said quietly, never as a failure.
  it('says a skipped LinkedIn quietly, apart from the failures', () => {
    const note = 'LinkedIn read 5 h ago; next after 15 h';
    render(<RefreshLastRun lastRun={{ ...LAST, failed: [], skipped: [{ name: 'linkedin', note }] }} />);
    expect(screen.getByText(note)).toHaveClass('text-muted');
    expect(screen.queryByText(/could not be reached/)).not.toBeInTheDocument();
  });

  it('leaves the failures out entirely when every source answered', () => {
    render(<RefreshLastRun lastRun={{ ...LAST, failed: [] }} />);
    expect(screen.queryByText(/could not be reached/)).not.toBeInTheDocument();
  });
});
