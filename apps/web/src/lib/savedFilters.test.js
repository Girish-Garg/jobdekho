import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toFilterState, toSavedFilters, mergeSave, EMPTY_FILTERS } from './savedFilters.js';

vi.mock('../api.js', () => ({
  getFilters: vi.fn(async () => ({})),
  putFilters: vi.fn(async () => null),
}));

import { getFilters, putFilters } from '../api.js';

beforeEach(() => vi.clearAllMocks());

describe('toFilterState', () => {
  it('maps the persisted names onto the filter-bar names', () => {
    const state = toFilterState({
      excludedSources: ['lever', 'ashby'],
      levels: ['mid'],
      workModes: ['remote', 'hybrid'],
      maxDegree: 'phd',
      minStipend: 5000,
      maxExperienceYears: 2,
      maxDurationMonths: 6,
    });
    expect(state).toEqual({
      excludedSources: ['lever', 'ashby'],
      levels: ['mid'],
      workModes: ['remote', 'hybrid'],
      maxDegree: 'phd',
      minStipend: '5000',
      maxExp: '2',
      maxMonths: '6',
    });
  });

  it('returns empty values for a filter saved before these fields existed', () => {
    expect(toFilterState({ includeKeywords: ['x'] })).toEqual({
      excludedSources: [],
      levels: [],
      workModes: [],
      maxDegree: '',
      minStipend: '',
      maxExp: '',
      maxMonths: '',
    });
  });

  // The old shape stored the boards to keep; nothing reads it any more, so a
  // filter saved under it must come back as "no source excluded".
  it('ignores a legacy sources include-list', () => {
    expect(toFilterState({ sources: ['lever'] })).toEqual(
      expect.objectContaining({ excludedSources: [] }),
    );
    expect(toFilterState({ sources: ['lever'] }).sources).toBeUndefined();
  });

  it('keeps a zero ceiling distinct from an unset one', () => {
    expect(toFilterState({ maxExperienceYears: 0 }).maxExp).toBe('0');
    expect(toFilterState({ maxExperienceYears: null }).maxExp).toBe('');
  });

  it('ignores non-array levels, work modes and exclusions', () => {
    expect(toFilterState({ levels: 'mid' }).levels).toEqual([]);
    expect(toFilterState({ excludedSources: 'lever' }).excludedSources).toEqual([]);
    expect(toFilterState({ workModes: 'remote' }).workModes).toEqual([]);
    expect(toFilterState().levels).toEqual([]);
    expect(toFilterState().excludedSources).toEqual([]);
    expect(toFilterState().workModes).toEqual([]);
  });
});

describe('toSavedFilters', () => {
  it('numbers the ceilings and nulls the unset ones', () => {
    expect(
      toSavedFilters({
        excludedSources: ['internshala'],
        levels: ['entry'],
        workModes: ['onsite'],
        maxDegree: '',
        minStipend: '5000',
        maxExp: '0',
        maxMonths: '',
      }),
    ).toEqual({
      excludedSources: ['internshala'],
      levels: ['entry'],
      workModes: ['onsite'],
      maxDegree: '',
      minStipend: 5000,
      maxExperienceYears: 0,
      maxDurationMonths: null,
    });
  });

  it('writes empty arrays rather than undefined when nothing is picked', () => {
    const saved = toSavedFilters({ levels: [], maxDegree: '', minStipend: '', maxExp: '', maxMonths: '' });
    expect(saved.excludedSources).toEqual([]);
    expect(saved.workModes).toEqual([]);
  });

  it('never writes the retired sources include-list', () => {
    expect(toSavedFilters({ ...EMPTY_FILTERS, sources: ['lever'] }).sources).toBeUndefined();
  });

  it('round-trips through toFilterState', () => {
    const saved = {
      excludedSources: ['lever'],
      levels: ['senior'],
      workModes: ['remote'],
      maxDegree: 'masters',
      minStipend: 1,
      maxExperienceYears: 5,
      maxDurationMonths: 3,
    };
    expect(toSavedFilters(toFilterState(saved))).toEqual(saved);
  });
});

describe('EMPTY_FILTERS', () => {
  // minFit is session-only on purpose: it depends on the profile at query
  // time, so saving it here could promise a cut that later silently never
  // lands.
  it('carries every field the bar reads, including the session-only ones', () => {
    expect(EMPTY_FILTERS).toEqual({
      excludedSources: [],
      levels: [],
      workModes: [],
      maxDegree: '',
      minStipend: '',
      maxExp: '',
      maxMonths: '',
      q: '',
      status: '',
      includeStale: false,
      minFit: '',
    });
  });
});

describe('mergeSave', () => {
  it('writes the patch over the stored filter instead of replacing it', async () => {
    getFilters.mockResolvedValueOnce({ includeKeywords: ['react'], locations: ['remote'], levels: ['mid'] });
    await mergeSave({ levels: ['staff'] });
    expect(putFilters).toHaveBeenCalledWith({
      includeKeywords: ['react'],
      locations: ['remote'],
      levels: ['staff'],
    });
  });

  it('still writes the patch when the stored filter cannot be read', async () => {
    getFilters.mockRejectedValueOnce(new Error('offline'));
    await mergeSave({ maxDegree: 'phd' });
    expect(putFilters).toHaveBeenCalledWith({ maxDegree: 'phd' });
  });
});
