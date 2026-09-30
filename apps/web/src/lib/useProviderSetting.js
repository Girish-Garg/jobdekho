import { useEffect, useState } from 'react';
import { getProviders, getProviderPreference, putProviderPreference } from '../api.js';
import { notifyError } from './toast.js';

// The AI CLI setting: what the probe found, the saved pick, and a pick that
// saves as it is made, the way the theme does. A Save button under two
// radio rows asked for a second click the theme choice beside it never did.
// A failed save puts the old pick back, so the cards never show a choice the
// server does not hold. `saved` is 'idle', 'saving', 'saved' or 'error'.
export function useProviderSetting() {
  const [provider, setProvider] = useState('auto');
  const [providers, setProviders] = useState([]);
  const [saved, setSaved] = useState('idle');

  useEffect(() => {
    getProviderPreference().then((p) => setProvider(p?.provider || 'auto')).catch(() => {});
    getProviders().then(setProviders).catch(() => {});
  }, []);

  async function pick(next) {
    if (next === provider) return;
    const before = provider;
    setProvider(next);
    setSaved('saving');
    try {
      await putProviderPreference({ provider: next });
      setSaved('saved');
    } catch (err) {
      setProvider(before);
      setSaved('error');
      notifyError(err, 'Could not save the AI CLI');
    }
  }

  return { provider, providers, saved, pick };
}
