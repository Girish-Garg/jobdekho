import { useEffect, useState } from 'react';
import { getProviderPreference } from '../api.js';
import { chatAnswerer } from './chatAnswerer.js';

// The CLI the panel's header names as the one answering. The preference is
// read once per mount, like the provider probe beside it: it only changes in
// Settings, and the panel is remounted every time it is opened. A failed read
// falls back to the server's own order, which is what it would do too.
export function useChatAnswerer(providers) {
  const [preferred, setPreferred] = useState(null);

  useEffect(() => {
    let alive = true;
    getProviderPreference()
      .then((pref) => alive && setPreferred(pref?.provider ?? null))
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return chatAnswerer(providers, preferred);
}
