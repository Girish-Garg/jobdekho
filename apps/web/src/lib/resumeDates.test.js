import { describe, it, expect } from 'vitest';
import { dateParts, endIsNewer, isLater, sameDate, sameEnd, sameMonth, saysNow, SWITCHED } from './resumeDates.js';

describe('dateParts', () => {
  it('reads the month however a resume writes it', () => {
    for (const text of ['Mar 2024', 'March 2024', 'march, 2024', '03/2024', '3-2024', '2024-03', '2024/3']) {
      expect([text, dateParts(text)]).toEqual([text, { year: 2024, month: 2 }]);
    }
  });

  it('keeps a year alone without a month, and reads no year as nothing', () => {
    expect(dateParts('2023')).toEqual({ year: 2023, month: null });
    expect(dateParts('Present')).toBeNull();
    expect(dateParts('')).toBeNull();
    expect(dateParts(undefined)).toBeNull();
  });
});

describe('comparing dates', () => {
  it('a later year or month is later, a year alone is not later than its own months', () => {
    expect(isLater(dateParts('Apr 2024'), dateParts('Jan 2025'))).toBe(true);
    expect(isLater(dateParts('Apr 2024'), dateParts('Aug 2024'))).toBe(true);
    expect(isLater(dateParts('Aug 2024'), dateParts('Apr 2024'))).toBe(false);
    expect(isLater(dateParts('2024'), dateParts('Dec 2024'))).toBe(false);
    expect(isLater(null, dateParts('2024'))).toBe(false);
  });

  it('sameMonth needs a month on both sides', () => {
    expect(sameMonth('Jan 2024', '01/2024')).toBe(true);
    expect(sameMonth('2024', '2024')).toBe(false);
    expect(sameMonth('Jan 2024', 'Feb 2024')).toBe(false);
  });

  it('sameDate takes two spellings of one date, and two words for now', () => {
    expect(sameDate('Jan 2024', 'January 2024')).toBe(true);
    expect(sameDate('Present', 'Current')).toBe(true);
    expect(sameDate('2024', '2024')).toBe(true);
    expect(sameDate('Jan 2024', 'Present')).toBe(false);
    expect(sameDate('Jan 2024', 'Jan 2025')).toBe(false);
  });

  it('says now only for a word that says it, never for an empty end', () => {
    expect(saysNow('Present')).toBe(true);
    expect(saysNow(' till date ')).toBe(true);
    expect(saysNow('')).toBe(false);
    expect(saysNow('Mar 2024')).toBe(false);
  });
});

describe('end dates', () => {
  it('reads an empty end as now where the section has the Still going switch', () => {
    expect(SWITCHED).toEqual(['experience', 'projects', 'education']);
    expect(sameEnd('experience', '', 'Present')).toBe(true);
    expect(sameEnd('certifications', '', 'Present')).toBe(false);
  });

  it('a later end, or now over an end that passed, is newer', () => {
    expect(endIsNewer('experience', 'Apr 2024', 'Aug 2024')).toBe(true);
    expect(endIsNewer('experience', 'Apr 2024', 'Present')).toBe(true);
    expect(endIsNewer('certifications', 'Mar 2026', 'Mar 2028')).toBe(true);
  });

  it('an earlier end, or a date over now, is not', () => {
    expect(endIsNewer('experience', 'Aug 2024', 'Apr 2024')).toBe(false);
    expect(endIsNewer('experience', 'Present', 'Aug 2024')).toBe(false);
    expect(endIsNewer('experience', '', 'Aug 2024')).toBe(false);
    expect(endIsNewer('experience', '', 'Present')).toBe(false);
    expect(endIsNewer('certifications', '', 'Present')).toBe(false);
  });
});
