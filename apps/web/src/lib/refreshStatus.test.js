import { describe, it, expect } from 'vitest';
import { refreshedAgo, refreshStatus } from './refreshStatus.js';

const NOW = Date.parse('2026-09-30T12:00:00.000Z');
const MIN = 60 * 1000;
const ago = (ms) => new Date(NOW - ms).toISOString();
const idle = (over = {}) => ({ running: false, startedAt: null, finishedAt: null, done: 0, total: 0, lastRun: null, ...over });

describe('refreshedAgo', () => {
  it('counts in the largest whole step', () => {
    expect(refreshedAgo(ago(20 * 1000), NOW)).toBe('just now');
    expect(refreshedAgo(ago(12 * MIN), NOW)).toBe('12 min ago');
    expect(refreshedAgo(ago(3 * 60 * MIN + 59 * MIN), NOW)).toBe('3 h ago');
    expect(refreshedAgo(ago(2 * 24 * 60 * MIN), NOW)).toBe('2 d ago');
  });

  it('is empty for a time it cannot read, and never counts backwards', () => {
    expect(refreshedAgo(null, NOW)).toBe('');
    expect(refreshedAgo('soon', NOW)).toBe('');
    expect(refreshedAgo(new Date(NOW + 5 * MIN).toISOString(), NOW)).toBe('just now');
  });
});

describe('refreshStatus', () => {
  it('says nothing before the state has arrived', () => {
    expect(refreshStatus(null, { now: NOW })).toEqual({ tone: 'idle', text: '' });
  });

  it('counts the sources while a refresh runs', () => {
    expect(refreshStatus(idle({ running: true, done: 42, total: 118 }), { now: NOW })).toEqual({ tone: 'busy', text: 'Refreshing: 42 of 118 sources' });
    expect(refreshStatus(idle({ running: true }), { now: NOW }).text).toBe('Starting the refresh');
  });

  it('says what a watched run found, how long ago, and which sources it missed', () => {
    const scrape = idle({ total: 118, finishedAt: ago(0), result: { fresh: 37, failed: ['a', 'b'] }, lastRun: { at: ago(0) } });
    expect(refreshStatus(scrape, { finished: true, now: NOW })).toEqual({
      tone: 'done', text: 'Done: 37 new  ·  just now', title: '2 of 118 sources could not be reached.',
    });
  });

  it('says how old the postings are when idle, or that they never were refreshed', () => {
    expect(refreshStatus(idle({ lastRun: { at: ago(3 * 60 * MIN) } }), { now: NOW }).text).toBe('Last refreshed 3 h ago');
    expect(refreshStatus(idle(), { now: NOW }).text).toBe('Not refreshed yet');
  });

  // A result from before this page was open is old news: the line says how
  // old the postings are rather than "Done".
  it('does not claim a run it did not watch just finished', () => {
    const scrape = idle({ result: { fresh: 5, failed: [] }, lastRun: { at: ago(3 * 60 * MIN) } });
    expect(refreshStatus(scrape, { finished: false, now: NOW })).toEqual({ tone: 'idle', text: 'Last refreshed 3 h ago' });
  });

  // LinkedIn read less than 20 hours ago is skipped by the server's guard:
  // the run is still done, and the skip is only a word on hover.
  it('keeps a run that skipped LinkedIn done, with the skip on hover and not counted as missed', () => {
    const skipped = [{ name: 'linkedin', note: 'LinkedIn read 5 h ago; next after 15 h' }];
    const scrape = idle({ total: 117, finishedAt: ago(0), result: { fresh: 12, failed: [], skipped }, lastRun: { at: ago(0) } });
    expect(refreshStatus(scrape, { finished: true, now: NOW })).toEqual({
      tone: 'done', text: 'Done: 12 new  ·  just now', title: 'LinkedIn read 5 h ago; next after 15 h.',
    });
    const both = { ...scrape, result: { fresh: 12, failed: ['a'], skipped } };
    expect(refreshStatus(both, { finished: true, now: NOW }).title).toBe('1 of 117 sources could not be reached. LinkedIn read 5 h ago; next after 15 h.');
  });

  it('says the last run failed, with the server\'s sentence on hover', () => {
    const scrape = idle({ error: 'The refresh could not finish.' });
    expect(refreshStatus(scrape, { now: NOW })).toEqual({ tone: 'error', text: 'Refresh failed', title: 'The refresh could not finish.' });
  });
});
