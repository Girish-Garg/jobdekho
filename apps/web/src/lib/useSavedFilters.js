import { useCallback, useEffect, useState } from 'react';
import { getFilters } from '../api.js';
import { EMPTY_FILTERS, mergeSave, toFilterState, toSavedFilters } from './savedFilters.js';

// The filter state the feed, the filter bar, the palette and the chat all
// read, seeded from the saved filter: that is what the person should see on
// sign-in. If it cannot be read we stay on the empty defaults rather than
// blocking the feed.
//
// `defaults.saved` is what JobDekho opens with, as last read or saved, so
// the filter bar can offer to save the filters on screen once they differ
// (see SaveFiltersButton.jsx); null until it is known, when nothing is
// offered. `defaults.save(filters)` keeps the ones on screen.
export function useSavedFilters() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [saved, setSaved] = useState(null);

  useEffect(() => {
    let alive = true;
    getFilters()
      .then((stored) => {
        if (!alive) return;
        const state = toFilterState(stored);
        setFilters({ ...EMPTY_FILTERS, ...state });
        setSaved(state);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const save = useCallback(async (current) => {
    const kept = toSavedFilters(current);
    await mergeSave(kept);
    setSaved(toFilterState(kept));
  }, []);

  return [filters, setFilters, { saved, save }];
}
