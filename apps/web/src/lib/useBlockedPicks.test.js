import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBlockedPicks } from './useBlockedPicks.js';

const NONE = [];

describe('useBlockedPicks', () => {
  // The server names the picks as the query sent them: a comma inside a
  // name went as a space (see feedQuery.js).
  it('lets go of each pick the feed says is blocked, and keeps the rest of the filters', () => {
    const setFilters = vi.fn();
    const filters = { q: 'react', companies: ['Acme, Inc.', 'Beta', 'PHONEPE LIMITED'] };
    renderHook(() => useBlockedPicks(['Acme  Inc.', 'PHONEPE LIMITED'], filters, setFilters));
    expect(setFilters).toHaveBeenCalledWith({ q: 'react', companies: ['Beta'] });
  });

  it('changes nothing while no pick is blocked', () => {
    const setFilters = vi.fn();
    renderHook(() => useBlockedPicks(NONE, { companies: ['Beta'] }, setFilters));
    expect(setFilters).not.toHaveBeenCalled();
  });

  it('acts once for the same answer, however often the page draws', () => {
    const setFilters = vi.fn();
    const filters = { companies: ['Acme'] };
    const { rerender } = renderHook(({ picks }) => useBlockedPicks(picks, filters, setFilters), { initialProps: { picks: ['Acme'] } });
    rerender({ picks: ['Acme'] });
    expect(setFilters).toHaveBeenCalledTimes(1);
  });
});
