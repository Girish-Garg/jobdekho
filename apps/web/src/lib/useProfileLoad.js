import { useEffect, useState } from 'react';
import { getProfile } from '../api.js';

// Reads the saved profile, and again on retry. A read that failed is its own
// state, never a blank profile: the record opens ready to type into, so a
// blank one standing in for a profile that could not be read would be saved
// over the real one by the first Save. `onLoaded` gets the profile, or null
// when the server has none yet.
export function useProfileLoad(onLoaded) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    getProfile()
      .then((profile) => alive && onLoaded(profile))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [attempt]);

  return { failed, retry: () => setAttempt((n) => n + 1) };
}
