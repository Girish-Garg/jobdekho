import { useEffect, useState } from 'react';
import { getSources } from '../api.js';

// The source list is a property of the feed, not of the user, so it is read
// once per mount. An unreachable endpoint leaves an empty list rather than
// blocking the rest of the filter bar.
export function useSources() {
  const [sources, setSources] = useState([]);

  useEffect(() => {
    let alive = true;
    getSources()
      .then((list) => alive && setSources(Array.isArray(list) ? list : []))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return sources;
}
