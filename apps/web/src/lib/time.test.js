import { describe, it, expect } from 'vitest';
import { shortStamp, relativeDay } from './time.js';

describe('shortStamp', () => {
  it('writes the day, month and time on a twelve-hour clock', () => {
    expect(shortStamp(new Date(2026, 8, 30, 14, 5).toISOString())).toBe('30 Sep, 2:05 pm');
    expect(shortStamp(new Date(2026, 0, 3, 0, 40).toISOString())).toBe('3 Jan, 12:40 am');
    expect(shortStamp(new Date(2026, 11, 31, 12, 0).toISOString())).toBe('31 Dec, 12:00 pm');
  });

  it('says nothing for a missing or broken time', () => {
    expect(shortStamp(null)).toBe('');
    expect(shortStamp('not a date')).toBe('');
  });
});

describe('relativeDay', () => {
  it('says today for a time in the last day', () => {
    expect(relativeDay(new Date().toISOString())).toBe('today');
  });
});
