import { useEffect, useState } from 'react';
import { getScrapeSettings, putScrapeSettings } from '../api.js';
import { notifyError } from './toast.js';

// The auto-refresh switch, saved as it is flipped like every other setting
// (see useProviderSetting.js). A failed save flips it back, so the switch
// never shows a choice the server does not hold. On until read otherwise,
// since that is the server's own default; `ready` is false until the saved
// value arrives, so a flip cannot race the read. `saved` is 'idle',
// 'saving', 'saved' or 'error'.
export function useRefreshSetting() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState('idle');

  useEffect(() => {
    getScrapeSettings()
      .then((s) => setAutoRefresh(s?.autoRefresh !== false))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  async function toggle(next) {
    if (next === autoRefresh) return;
    const before = autoRefresh;
    setAutoRefresh(next);
    setSaved('saving');
    try {
      await putScrapeSettings({ autoRefresh: next });
      setSaved('saved');
    } catch (err) {
      setAutoRefresh(before);
      setSaved('error');
      notifyError(err, 'Could not save the refresh setting');
    }
  }

  return { autoRefresh, ready, saved, toggle };
}
