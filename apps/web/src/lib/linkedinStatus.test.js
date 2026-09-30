import { describe, it, expect } from 'vitest';
import { linkedinStatus, shortDay } from './linkedinStatus.js';

const NOW = Date.parse('2026-09-30T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;
const at = (ms) => new Date(ms).toISOString();
const status = (over = {}) => ({ lastSweepAt: null, pausedUntil: null, nextAfter: null, ...over });

describe('linkedinStatus', () => {
  it('says Off when the switch is off, whatever the guard says', () => {
    expect(linkedinStatus(false, status({ lastSweepAt: at(NOW - HOUR) }), NOW)).toEqual({ text: 'Off', paused: false });
  });

  it('says nothing before the state has arrived', () => {
    expect(linkedinStatus(true, null, NOW)).toEqual({ text: '', paused: false });
  });

  it('says when LinkedIn was read and how long until it can be again', () => {
    const s = status({ lastSweepAt: at(NOW - 5 * HOUR), nextAfter: at(NOW + 15 * HOUR) });
    expect(linkedinStatus(true, s, NOW).text).toBe('Read 5 h ago, next after 15 h');
    const soon = status({ lastSweepAt: at(NOW - 20 * HOUR + 30 * 60 * 1000), nextAfter: at(NOW + 30 * 60 * 1000) });
    expect(linkedinStatus(true, soon, NOW).text).toBe('Read 19 h ago, next after 30 min');
  });

  it('says the next refresh reads it once the wait is over', () => {
    expect(linkedinStatus(true, status({ lastSweepAt: at(NOW - 26 * HOUR) }), NOW).text).toBe('Read 1 d ago, next with the next refresh');
    expect(linkedinStatus(true, status(), NOW).text).toBe('Not read yet: the next refresh reads it');
  });

  // Midday UTC, so the day is the same in any time zone the tests run in.
  it('names the day a pause ends, and marks it', () => {
    const s = status({ lastSweepAt: at(NOW), pausedUntil: '2026-10-03T12:00:00.000Z', nextAfter: '2026-10-03T12:00:00.000Z' });
    expect(linkedinStatus(true, s, NOW)).toEqual({ text: 'Paused until Sat 3 Oct: LinkedIn refused the last read', paused: true });
  });
});

describe('shortDay', () => {
  it('is the weekday, the date and the month, or nothing for a time it cannot read', () => {
    expect(shortDay('2026-10-02T12:00:00.000Z')).toBe('Fri 2 Oct');
    expect(shortDay('soon')).toBe('');
  });
});
