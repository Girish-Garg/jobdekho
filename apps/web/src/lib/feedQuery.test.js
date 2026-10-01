import { describe, it, expect } from 'vitest';
import { feedQuery } from './feedQuery.js';
import { EMPTY_FILTERS } from './savedFilters.js';

describe('feedQuery', () => {
  it('names the bar\'s state as the server reads it', () => {
    const query = feedQuery({ ...EMPTY_FILTERS, levels: ['entry', 'mid'], maxExp: '2', maxMonths: '3', q: 'react' });
    expect(query).toMatchObject({ q: 'react', levels: 'entry,mid', maxExperienceYears: '2', maxDurationMonths: '3' });
  });

  // The server splits the list on commas; a comma inside a name would make
  // it two, and as a space it changes nothing the server's key reads.
  it('sends a comma inside a company name as a space', () => {
    expect(feedQuery({ ...EMPTY_FILTERS, companies: ['Acme, Inc.', 'Razorpay'] }).companies).toBe('Acme  Inc.,Razorpay');
  });

  it('takes the search it is given over the one being typed', () => {
    expect(feedQuery({ ...EMPTY_FILTERS, q: 'reac' }, 'react').q).toBe('react');
  });
});
