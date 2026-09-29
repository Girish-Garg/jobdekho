import { describe, it, expect } from 'vitest';
import { sourceName } from './sourceName.js';

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
