import { useEffect, useState } from 'react';
import { getProfile } from '../api.js';

// One profile read for a whole view, so the match reasons never fetch per
// card. undefined means "not answered yet" and a failed read stays there:
// only the server's own JSON null may claim the user has no profile, because
// that claim drives a "go set one up" banner.
export function useProfile(enabled = true) {
  const [profile, setProfile] = useState(undefined);

  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    getProfile()
      .then((p) => alive && setProfile(p))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [enabled]);

  return profile;
}
