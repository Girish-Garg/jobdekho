import { describe, it, expect } from 'vitest';
import { datesText, isOngoing, smallFields } from './entryFields.js';

const entry = (over = {}) => ({ location: '', startDate: '', endDate: '', ...over });

describe('smallFields', () => {
  it('is the section\'s own row, and the dated four for a section that names none', () => {
    expect(smallFields({}, entry())).toEqual(['location', 'startDate', 'endDate', 'ongoing']);
    expect(smallFields({ small: ['startDate', 'endDate'] }, entry())).toEqual(['startDate', 'endDate']);
  });

  it('still shows a field the section leaves out when the entry has something in it', () => {
    expect(smallFields({ small: ['location', 'startDate'] }, entry({ endDate: '2024' }))).toEqual(['location', 'startDate', 'endDate']);
    expect(smallFields({ small: ['startDate'] }, entry({ location: ' ' }))).toEqual(['startDate']);
  });
});

describe('isOngoing', () => {
  it('reads an empty end, or one that says so, as still going', () => {
    for (const end of ['', '  ', undefined, 'Present', 'present', 'Current', 'now', 'Till date']) expect(isOngoing(end)).toBe(true);
    for (const end of ['2024', 'Mar 2024', 'Presently paused']) expect(isOngoing(end)).toBe(false);
  });
});

describe('datesText', () => {
  it('says "to now" for an entry still going, and "to" the end otherwise', () => {
    expect(datesText(entry({ startDate: 'Jan 2025' }), true)).toBe('Jan 2025 to now');
    expect(datesText(entry({ startDate: 'Jan 2025', endDate: 'Present' }), true)).toBe('Jan 2025 to now');
    expect(datesText(entry({ startDate: 'Jan 2023', endDate: 'Mar 2024' }), true)).toBe('Jan 2023 to Mar 2024');
    expect(datesText(entry(), true)).toBe('');
  });

  it('reads an empty end as no end where the section has no switch', () => {
    expect(datesText(entry({ startDate: 'Mar 2024' }), false)).toBe('Mar 2024');
    expect(datesText(entry({ endDate: '2022' }), false)).toBe('2022');
  });
});
