import { useEffect, useState } from 'react';
import { getProviders, getProviderPreference, putProviderPreference } from '../api.js';
import { notifyError } from './toast.js';

// The AI CLI setting: what the probe found, the saved pick, and a pick that
// saves as it is made, the way the theme does. A Save button under two
// radio rows asked for a second click the theme choice beside it never did.
// A failed save puts the old pick back, so the cards never show a choice the
// server does not hold. `saved` is 'idle', 'saving', 'saved' or 'error'.
//
// Beside the provider, `models`: the model each AI answers with, by id,
// { claude?, agy?, ollama? }; one left out is that AI's default. Each save
// names only what changed: the server keeps the rest as it was.
export function useProviderSetting() {
  const [provider, setProvider] = useState('auto');
  const [models, setModels] = useState({});
  const [providers, setProviders] = useState([]);
  const [saved, setSaved] = useState('idle');

  useEffect(() => {
    getProviderPreference()
      .then((p) => {
        setProvider(p?.provider || 'auto');
        setModels(p?.models || {});
      })
      .catch(() => {});
    getProviders().then(setProviders).catch(() => {});
  }, []);

  async function save(body, apply, undo, failure) {
    apply();
    setSaved('saving');
    try {
      await putProviderPreference(body);
      setSaved('saved');
    } catch (err) {
      undo();
      setSaved('error');
      notifyError(err, failure);
    }
  }

  function pick(next) {
    if (next === provider) return;
    const before = provider;
    save({ provider: next }, () => setProvider(next), () => setProvider(before), 'Could not save the AI CLI');
  }

  function pickModel(providerId, next) {
    if (next === models[providerId]) return;
    const before = models;
    save({ models: { [providerId]: next } }, () => setModels({ ...before, [providerId]: next }), () => setModels(before), 'Could not save the model');
  }

  return { provider, models, providers, saved, pick, pickModel };
}
