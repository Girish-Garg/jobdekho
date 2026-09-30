import { useEffect, useState } from 'react';
import { getProviders, getProviderPreference, putProviderPreference } from '../api.js';
import { notifyError } from './toast.js';

// The AI CLI setting: what the probe found, the saved pick, and a pick that
// saves as it is made, the way the theme does. A Save button under two
// radio rows asked for a second click the theme choice beside it never did.
// A failed save puts the old pick back, so the cards never show a choice the
// server does not hold. `saved` is 'idle', 'saving', 'saved' or 'error'.
//
// Beside the provider, the Ollama model (null until one is picked, which the
// server reads as Ollama's first model). Each saves only itself: the server
// keeps the other as it was.
export function useProviderSetting() {
  const [provider, setProvider] = useState('auto');
  const [ollamaModel, setOllamaModel] = useState(null);
  const [providers, setProviders] = useState([]);
  const [saved, setSaved] = useState('idle');

  useEffect(() => {
    getProviderPreference()
      .then((p) => {
        setProvider(p?.provider || 'auto');
        setOllamaModel(p?.ollamaModel || null);
      })
      .catch(() => {});
    getProviders().then(setProviders).catch(() => {});
  }, []);

  async function save(field, next, before, set, failure) {
    set(next);
    setSaved('saving');
    try {
      await putProviderPreference({ [field]: next });
      setSaved('saved');
    } catch (err) {
      set(before);
      setSaved('error');
      notifyError(err, failure);
    }
  }

  function pick(next) {
    if (next === provider) return;
    save('provider', next, provider, setProvider, 'Could not save the AI CLI');
  }

  function pickModel(next) {
    if (next === ollamaModel) return;
    save('ollamaModel', next, ollamaModel, setOllamaModel, 'Could not save the Ollama model');
  }

  return { provider, ollamaModel, providers, saved, pick, pickModel };
}
