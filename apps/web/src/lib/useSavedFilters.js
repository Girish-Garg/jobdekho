import { useEffect, useState } from 'react';
import { getFilters } from '../api.js';
import { EMPTY_FILTERS, toFilterState } from './savedFilters.js';

// The filter state the feed, the filter bar, the palette and the chat all
// read, seeded from the saved filter: that is what the person should see on
// sign-in. If it cannot be read we stay on the empty defaults rather than
// blocking the feed.
export function useSavedFilters() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  useEffect(() => {
    let alive = true;
    getFilters()
      .then((saved) => alive && setFilters({ ...EMPTY_FILTERS, ...toFilterState(saved) }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return [filters, setFilters];
}
