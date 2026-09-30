import { useEffect, useState } from 'react';

// A value that follows its source only once the source has held still for
// `ms`. The search box sets the feed's filter on every keystroke, and each
// change asked the server for a fresh page: typing "frontend" sent eight.
// The box itself stays instant; only the fetch waits for the pause.
export function useDebounced(value, ms = 300) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return settled;
}
