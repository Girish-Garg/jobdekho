import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSavedFilters } from './useSavedFilters.js';
import { EMPTY_FILTERS } from './savedFilters.js';

vi.mock('../api.js', () => ({
  getFilters: vi.fn(async () => ({ levels: ['entry'], includeKeywords: ['react'] })),
  putFilters: vi.fn(async () => null),
}));

import { getFilters, putFilters } from '../api.js';

beforeEach(() => vi.clearAllMocks());

describe('useSavedFilters', () => {
  it('opens on the saved filters and keeps them as what JobDekho opens with', async () => {
    const { result } = renderHook(() => useSavedFilters());
    expect(result.current[2].saved).toBeNull();
    await waitFor(() => expect(result.current[0].levels).toEqual(['entry']));
    expect(result.current[2].saved).toMatchObject({ levels: ['entry'], workModes: [] });
  });

  // The PUT carries the persisted names, keeps the fields the bar does not
  // carry (the keywords), and moves what JobDekho opens with.
  it('saves the filters on screen under the persisted names', async () => {
    const { result } = renderHook(() => useSavedFilters());
    await waitFor(() => expect(result.current[2].saved).not.toBeNull());
    const shown = { ...EMPTY_FILTERS, excludedSources: ['lever'], levels: ['mid', 'senior'], workModes: ['remote'], maxDegree: 'bachelors', minStipend: '5000', maxExp: '2', maxMonths: '6', q: 'go' };
    await act(() => result.current[2].save(shown));
    expect(getFilters).toHaveBeenCalledTimes(2);
    expect(putFilters).toHaveBeenCalledWith({
      levels: ['mid', 'senior'], includeKeywords: ['react'], excludedSources: ['lever'], workModes: ['remote'],
      maxDegree: 'bachelors', minStipend: 5000, maxExperienceYears: 2, maxDurationMonths: 6,
    });
    expect(result.current[2].saved).toMatchObject({ levels: ['mid', 'senior'], minStipend: '5000', maxExp: '2' });
  });

  it('keeps what JobDekho opens with when the save fails', async () => {
    const { result } = renderHook(() => useSavedFilters());
    await waitFor(() => expect(result.current[2].saved).not.toBeNull());
    putFilters.mockRejectedValueOnce(new Error('boom'));
    await expect(act(() => result.current[2].save({ ...EMPTY_FILTERS, levels: ['senior'] }))).rejects.toThrow('boom');
    expect(result.current[2].saved.levels).toEqual(['entry']);
  });
});
