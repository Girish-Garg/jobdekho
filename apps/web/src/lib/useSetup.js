import { useEffect, useState } from 'react';
import { getSetup } from '../api.js';

// The setup checks (see the server's setup/checks.js), asked once on mount;
// the server answers from its cached AI detection, so every mount is cheap.
// refresh() is "Check again": it re-probes the AIs, which takes seconds, so
// `checking` is exposed for the button that starts it. `checks` is undefined
// until the first answer and null when the check could not run, so a screen
// can tell "still looking" from "could not look" (see useProviders.js, which
// this mirrors).
export function useSetup() {
  const [checks, setChecks] = useState(undefined);
  const [checking, setChecking] = useState(false);

  async function load(refresh) {
    setChecking(true);
    try {
      setChecks(await getSetup({ refresh }));
    } catch {
      setChecks(null);
    }
    setChecking(false);
  }

  useEffect(() => {
    load(false);
  }, []);

  return { checks, checking, refresh: () => load(true) };
}
