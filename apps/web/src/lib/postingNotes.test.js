import { describe, it, expect } from 'vitest';
import { isNew, foundToday, ageText, detailNotes } from './postingNotes.js';

const daysAgo = (d) => new Date(Date.now() - d * 24 * 3600 * 1000).toISOString();

describe('newness', () => {
  it('is New only on the board date, and Found today otherwise', () => {
    expect(isNew({ newness: 'new' })).toBe(true);
    expect(isNew({ newness: 'found-today' })).toBe(false);
    expect(foundToday({ newness: 'found-today' })).toBe(true);
    expect(foundToday({ newness: null })).toBe(false);
  });
});

describe('ageText', () => {
  it('keeps the posting age beside Found today, since that is when it was posted', () => {
    expect(ageText({ postedAt: daysAgo(9), firstSeenAt: daysAgo(0), newness: 'found-today' })).toBe('9d ago');
  });

  // A board that gives no date: today is when it was found, not posted.
  it('says no age where Found today is all that is known', () => {
    expect(ageText({ postedAt: null, firstSeenAt: daysAgo(0), newness: 'found-today' })).toBe('');
  });

  it('says Posted today for a posting the board dates today', () => {
    expect(ageText({ postedAt: daysAgo(0), firstSeenAt: daysAgo(0), newness: 'new' })).toBe('Posted today');
  });
});

describe('detailNotes', () => {
  it('ends the details line with Found today and Few details where they apply', () => {
    expect(detailNotes({ newness: 'found-today', fewDetails: true })).toEqual(['Found today', 'Few details']);
    expect(detailNotes({ newness: 'new', fewDetails: false })).toEqual([]);
  });
});
