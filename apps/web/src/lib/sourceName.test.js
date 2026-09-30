import { describe, it, expect } from 'vitest';
import { sourceLabel, sourceName } from './sourceName.js';

describe('sourceName', () => {
  it('names the board the way the board names itself, not the scraper key', () => {
    expect(sourceName('smartrecruiters:PhonePeLimited')).toBe('SmartRecruiters');
    expect(sourceName('greenhouse:razorpaysoftwareprivatelimited')).toBe('Greenhouse');
    expect(sourceName('internshala')).toBe('Internshala');
  });

  it('capitalises a board it does not know, and is empty for none', () => {
    expect(sourceName('newboard:acme')).toBe('Newboard');
    expect(sourceName('')).toBe('');
    expect(sourceName(undefined)).toBe('');
  });
});

describe('sourceLabel', () => {
  it('puts the company first and its board under it', () => {
    expect(sourceLabel('greenhouse:okta')).toEqual({ title: 'Okta', board: 'Greenhouse' });
    expect(sourceLabel('smartrecruiters:BoschGroup')).toEqual({ title: 'BoschGroup', board: 'SmartRecruiters' });
    expect(sourceLabel('lever:acme-labs_india')).toEqual({ title: 'Acme labs india', board: 'Lever' });
  });

  it('names a whole job board by itself', () => {
    expect(sourceLabel('internshala')).toEqual({ title: 'Internshala', board: 'Job board' });
    expect(sourceLabel('linkedin')).toEqual({ title: 'LinkedIn', board: 'Job board' });
  });

  // "in" is the country Adzuna was searched in, not a company called In.
  it('names Adzuna as a whole board, whatever country it searched', () => {
    expect(sourceLabel('adzuna:in')).toEqual({ title: 'Adzuna', board: 'Job board' });
    expect(sourceName('adzuna:in')).toBe('Adzuna');
  });
});
