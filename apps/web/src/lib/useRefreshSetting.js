import { useEffect, useState } from 'react';
import { getScrapeSettings, putScrapeSettings } from '../api.js';
import { notifyError } from './toast.js';

const DEFAULTS = { autoRefresh: true, linkedin: true };
const COULD_NOT = { autoRefresh: 'Could not save the refresh setting', linkedin: 'Could not save the LinkedIn setting' };

// The refresh switches, the daily refresh and Include LinkedIn, each saved
// on its own as it is flipped like every other setting (see
// useProviderSetting.js). A failed save flips it back, so a switch never
// shows a choice the server does not hold. On until read otherwise, since
// that is the server's own default; `ready` is false until the saved values
// arrive, so a flip cannot race the read. `saved` is 'idle', 'saving',
// 'saved' or 'error'.
export function useRefreshSetting() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState('idle');

  useEffect(() => {
    getScrapeSettings()
      .then((s) => setSettings({ autoRefresh: s?.autoRefresh !== false, linkedin: s?.linkedin !== false }))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  // Only the switch that moved is sent, and only it is put back on failure,
  // so flipping one never undoes a flip of the other.
  async function change(key, next) {
    if (next === settings[key]) return;
    setSettings((s) => ({ ...s, [key]: next }));
    setSaved('saving');
    try {
      await putScrapeSettings({ [key]: next });
      setSaved('saved');
    } catch (err) {
      setSettings((s) => ({ ...s, [key]: !next }));
      setSaved('error');
      notifyError(err, COULD_NOT[key]);
    }
  }

  return {
    ...settings,
    ready,
    saved,
    toggle: (next) => change('autoRefresh', next),
    toggleLinkedin: (next) => change('linkedin', next),
  };
}
