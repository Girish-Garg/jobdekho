import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import RefreshPostings from './RefreshPostings.jsx';
import { onRefreshed } from '../lib/postingsRefreshedSignal.js';

vi.mock('../api.js', () => ({ getScrapeState: vi.fn(), startScrape: vi.fn() }));

import { getScrapeState, startScrape } from '../api.js';

const NOW = Date.parse('2026-09-30T12:00:00.000Z');
const MIN = 60 * 1000;
const ago = (ms) => new Date(NOW - ms).toISOString();
const RESULT = { fresh: 37, total: 900, tooOld: 0, removed: 2, failed: [] };
const IDLE = { running: false, startedAt: null, finishedAt: null, done: 0, total: 0, lastRun: null };
const idleSince = (ms) => ({ ...IDLE, lastRun: { at: ago(ms), fresh: 3, sources: 118, failed: [] } });
const running = (done) => ({ ...IDLE, running: true, startedAt: ago(0), done, total: 118 });
const finished = { ...IDLE, finishedAt: ago(0), done: 118, total: 118, result: RESULT, lastRun: { at: ago(0), fresh: 37, sources: 118, failed: [] } };

// The clock and the poll both run on fake timers, moved on by hand.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.clearAllMocks();
  getScrapeState.mockResolvedValue(IDLE);
});
afterEach(() => vi.useRealTimers());

const tick = (ms = 0) => act(() => vi.advanceTimersByTimeAsync(ms));

async function mount() {
  render(<RefreshPostings />);
  await tick();
}

const button = () => screen.getByRole('button', { name: /Refresh postings/ });

describe('RefreshPostings', () => {
  it('says how old the postings are while nothing runs', async () => {
    getScrapeState.mockResolvedValue(idleSince(3 * 60 * MIN));
    await mount();
    expect(screen.getByText('Last refreshed 3 h ago')).toBeInTheDocument();
    expect(button()).toBeEnabled();
  });

  it('says so when the postings were never refreshed', async () => {
    await mount();
    expect(screen.getByText('Not refreshed yet')).toBeInTheDocument();
  });

  it('counts on by the minute while the page is open', async () => {
    getScrapeState.mockResolvedValue(idleSince(59 * MIN));
    await mount();
    expect(screen.getByText('Last refreshed 59 min ago')).toBeInTheDocument();
    await tick(MIN);
    expect(screen.getByText('Last refreshed 1 h ago')).toBeInTheDocument();
  });

  it('starts a refresh, counts the sources as they finish, then says what it found and reloads the feed', async () => {
    const refreshed = vi.fn();
    const stop = onRefreshed(refreshed);
    await mount();
    startScrape.mockResolvedValue(running(0));
    getScrapeState.mockResolvedValueOnce(running(0)).mockResolvedValueOnce(running(42)).mockResolvedValue(finished);
    fireEvent.click(button());
    await tick();
    expect(startScrape).toHaveBeenCalledTimes(1);
    expect(button()).toBeDisabled();
    await tick(1500);
    expect(screen.getByText('Refreshing: 42 of 118 sources')).toBeInTheDocument();
    expect(refreshed).not.toHaveBeenCalled();
    await tick(1500);
    expect(screen.getByText('Done: 37 new · just now')).toBeInTheDocument();
    expect(button()).toBeEnabled();
    expect(refreshed).toHaveBeenCalledWith(RESULT);
    stop();
  });

  it('picks up a refresh already running when the page loads', async () => {
    getScrapeState.mockResolvedValue(running(80));
    await mount();
    expect(screen.getByText('Refreshing: 80 of 118 sources')).toBeInTheDocument();
    expect(button()).toBeDisabled();
  });

  it('says the refresh failed, with the reason on hover', async () => {
    getScrapeState.mockResolvedValue({ ...IDLE, finishedAt: ago(0), error: 'The refresh could not finish.' });
    await mount();
    expect(screen.getByText('Refresh failed')).toHaveAttribute('title', 'The refresh could not finish.');
    expect(screen.getByText('Refresh failed')).toHaveClass('text-ember');
  });
});
