import { useEffect, useState } from 'react';
import { getAdzunaKey, saveAdzunaKey, removeAdzunaKey, checkAdzunaKey } from '../api.js';

// Settings' Adzuna card: the key in use as the server describes it (`view`,
// undefined while loading and null when it could not be read), the two
// fields, which action is under way (`busy`: 'save', 'check', 'remove' or
// null) and the last action's outcome (`note`: { tone, text }).
//
// The key field is emptied once a key is saved or removed, so the secret
// sits in the page no longer than it takes to send; the app id stays, being
// an identifier the server shows anyway. "Check key" tries the typed pair
// when the key field has something in it, otherwise the key already in use.
// The variables a key falls back on are named as in adzunaStatus.js, so this
// note and the status line above it agree.
const SAVED = 'Saved. Every refresh now includes Adzuna.';
const REMOVED = 'Removed from Settings.';
const REMOVED_ENV = 'Removed from Settings. The key from ADZUNA_APP_ID and ADZUNA_APP_KEY is used instead.';

export function useAdzunaKey() {
  const [view, setView] = useState(undefined);
  const [appId, setAppId] = useState('');
  const [appKey, setAppKey] = useState('');
  const [busy, setBusy] = useState(null);
  const [note, setNote] = useState(null);

  useEffect(() => {
    getAdzunaKey()
      .then((v) => {
        setView(v);
        setAppId(v?.appId ?? '');
      })
      .catch(() => setView(null));
  }, []);

  async function act(kind, run) {
    setBusy(kind);
    setNote(null);
    try {
      setNote(await run());
    } catch (err) {
      setNote({ tone: 'error', text: err.message });
    }
    setBusy(null);
  }

  const save = () => act('save', async () => {
    setView(await saveAdzunaKey({ appId, appKey }));
    setAppKey('');
    return { tone: 'ok', text: SAVED };
  });

  const check = () => act('check', async () => {
    const res = await checkAdzunaKey(appKey.trim() ? { appId, appKey } : {});
    return { tone: res.ok ? 'ok' : 'error', text: res.message };
  });

  const remove = () => act('remove', async () => {
    const next = await removeAdzunaKey();
    setView(next);
    setAppKey('');
    setAppId(next?.appId ?? '');
    return { tone: 'muted', text: next?.configured ? REMOVED_ENV : REMOVED };
  });

  return { view, appId, setAppId, appKey, setAppKey, busy, note, save, check, remove };
}
