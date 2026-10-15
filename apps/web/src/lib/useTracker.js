import { useEffect, useState } from 'react';
import { getTracker, addTrackerEntry, updateTrackerEntry, removeTrackerEntry } from '../api.js';
import { onTrackerChanged } from './trackerSignal.js';

// The Tracker's entries as the page shows them: undefined while loading,
// null when they could not be read (`error` says why). A change the server
// takes moves its entry to the top, the newest activity, which is where the
// server's own order would put it on the next read. A mail sent from the
// chat beside the page reads them again (see trackerSignal.js).
export function useTracker() {
  const [entries, setEntries] = useState(undefined);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    const read = () => getTracker().then(
      (data) => live && setEntries(data.entries ?? []),
      (err) => {
        if (!live) return;
        setEntries(null);
        setError(err.message);
      },
    );
    read();
    const stop = onTrackerChanged(read);
    return () => {
      live = false;
      stop();
    };
  }, []);

  const put = (entry) => setEntries((list) => [entry, ...(list ?? []).filter((one) => one.id !== entry.id)]);

  return {
    entries,
    error,
    add: async (fields) => put((await addTrackerEntry(fields)).entry),
    update: async (id, patch) => put((await updateTrackerEntry(id, patch)).entry),
    remove: async (id) => {
      await removeTrackerEntry(id);
      setEntries((list) => (list ?? []).filter((one) => one.id !== id));
    },
  };
}
