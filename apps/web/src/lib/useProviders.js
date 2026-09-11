import { useEffect, useState } from 'react';
import { getProviders } from '../api.js';

// Which AI CLIs the server can drive. The server caches the probe, so asking
// on every mount is free; refresh() re-probes for the moment right after an
// install. A probe can take seconds, so `checking` is exposed for the button
// that triggers it. A failed request reads as "none found" rather than
// blocking the screen: the hint that produces still offers the re-check,
// which is the right next step either way.
export function useProviders() {
  const [providers, setProviders] = useState(undefined);
  const [checking, setChecking] = useState(false);

  async function load(refresh) {
    setChecking(true);
    try {
      setProviders(await getProviders({ refresh }));
    } catch {
      setProviders([]);
    }
    setChecking(false);
  }

  useEffect(() => {
    load(false);
  }, []);

  return { providers, checking, refresh: () => load(true) };
}
