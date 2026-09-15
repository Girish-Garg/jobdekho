import { useEffect, useState } from 'react';

// A plain resize listener fires on every pixel; matchMedia only fires when
// the query's truth value actually flips, and jsdom has no matchMedia at
// all, so this has to survive that the way lib/theme.js already does.
export function useMediaQuery(query, view = globalThis) {
  const [matches, setMatches] = useState(() => Boolean(view?.matchMedia?.(query)?.matches));

  useEffect(() => {
    const media = view?.matchMedia?.(query);
    if (!media) return undefined;
    setMatches(media.matches);
    // Guard the same way lib/theme.js does: a media query object with no
    // addEventListener (a stub in a test, an old Safari) still reports an
    // initial value, it just cannot be watched for a later flip.
    if (!media.addEventListener) return undefined;
    const handler = () => setMatches(media.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [query, view]);

  return matches;
}
