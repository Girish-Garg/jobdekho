import { describe, it, expect } from 'vitest';
import { activeChips } from './activeChips.js';
import { EMPTY_FILTERS } from './savedFilters.js';

const labels = (filters) => activeChips(filters).map((c) => c.label);

describe('activeChips', () => {
  it('renders nothing for a blank filter', () => {
    expect(activeChips(EMPTY_FILTERS)).toEqual([]);
    expect(activeChips()).toEqual([]);
    expect(activeChips({})).toEqual([]);
  });

  it('emits one chip per picked level', () => {
    expect(labels({ ...EMPTY_FILTERS, levels: ['senior', 'internship'] })).toEqual(['Senior', 'Internship']);
  });

  it('emits one chip per picked work mode', () => {
    expect(labels({ ...EMPTY_FILTERS, workModes: ['remote', 'hybrid'] })).toEqual(['Remote', 'Hybrid']);
  });

  it('names the status by its pill label', () => {
    expect(labels({ ...EMPTY_FILTERS, status: 'applied' })).toEqual(['Applied']);
  });

  it('labels the keyword so the chip is not just the bare term', () => {
    expect(labels({ ...EMPTY_FILTERS, q: 'react' })).toEqual(['Search: react']);
  });

  it('names the fit floor by its grade', () => {
    expect(labels({ ...EMPTY_FILTERS, minFit: '62' })).toEqual(['Grade A']);
    expect(labels({ ...EMPTY_FILTERS, minFit: '38' })).toEqual(['Grade C or better']);
  });

  // An action button in a chat turn from before the grades can still set 44.
  it('names a floor from before the grades by its number', () => {
    expect(labels({ ...EMPTY_FILTERS, minFit: '44' })).toEqual(['Fit 44 and up']);
  });

  it('collapses the exclusions into one counted chip', () => {
    expect(labels({ ...EMPTY_FILTERS, excludedSources: ['a', 'b', 'c'] })).toEqual(['3 sources excluded']);
    expect(labels({ ...EMPTY_FILTERS, excludedSources: ['a'] })).toEqual(['1 source excluded']);
  });

  it('reuses the select copy for the numeric ceilings', () => {
    const filters = { ...EMPTY_FILTERS, minStipend: '10000', maxExp: '2', maxMonths: '3', maxDegree: 'masters' };
    expect(labels(filters)).toEqual(["Master's", '₹10,000+ /mo', 'Up to 2 years experience', 'Up to 3 months']);
  });

  // '0' is a real ceiling, and the falsy-string trap is exactly how it goes
  // missing.
  it('keeps a Fresher ceiling of zero', () => {
    expect(labels({ ...EMPTY_FILTERS, maxExp: '0' })).toEqual(['Fresher roles only']);
  });

  it('gives every remove control a spoken name', () => {
    const chips = activeChips({
      ...EMPTY_FILTERS,
      q: 'go',
      minFit: '50',
      levels: ['senior'],
      workModes: ['remote'],
      excludedSources: ['lever'],
      minStipend: '10000',
    });
    expect(chips.map((c) => c.remove)).toEqual([
      'Remove search filter',
      'Remove Grade B or better filter',
      'Remove Senior filter',
      'Remove Remote filter',
      'Remove source exclusions filter',
      'Remove ₹10,000+ /mo filter',
    ]);
  });

  it('has unique keys when several chips come from one field', () => {
    const ids = activeChips({ ...EMPTY_FILTERS, levels: ['mid', 'senior'] }).map((c) => c.id);
    expect(new Set(ids).size).toBe(2);
  });
});

describe('activeChips removal patches', () => {
  const patchFor = (filters, label) => activeChips(filters).find((c) => c.label === label).patch;

  it('drops only the level it belongs to', () => {
    const filters = { ...EMPTY_FILTERS, levels: ['mid', 'senior', 'staff'] };
    expect(patchFor(filters, 'Senior')).toEqual({ levels: ['mid', 'staff'] });
  });

  it('drops only the work mode it belongs to', () => {
    const filters = { ...EMPTY_FILTERS, workModes: ['remote', 'onsite'] };
    expect(patchFor(filters, 'Onsite')).toEqual({ workModes: ['remote'] });
  });

  it('re-includes every source at once', () => {
    const filters = { ...EMPTY_FILTERS, excludedSources: ['a', 'b'] };
    expect(patchFor(filters, '2 sources excluded')).toEqual({ excludedSources: [] });
  });

  it('blanks the scalar fields', () => {
    const filters = { ...EMPTY_FILTERS, q: 'x', status: 'saved', maxExp: '2', minFit: '62' };
    expect(patchFor(filters, 'Search: x')).toEqual({ q: '' });
    expect(patchFor(filters, 'Saved')).toEqual({ status: '' });
    expect(patchFor(filters, 'Up to 2 years experience')).toEqual({ maxExp: '' });
    expect(patchFor(filters, 'Grade A')).toEqual({ minFit: '' });
  });
});
