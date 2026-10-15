import { useEffect, useState } from 'react';
import { getTracker, addTrackerEntry, updateTrackerEntry, removeTrackerEntry, markNotAJob } from '../api.js';
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
    // A stage moves on screen at once, the way a dragged card lands, and
    // goes back if the server refuses it.
    update: async (id, patch) => {
      let before = null;
      if (patch.stage) {
        setEntries((list) => {
          before = list;
          return (list ?? []).map((one) => (one.id === id ? { ...one, stage: patch.stage } : one));
        });
      }
      try {
        put((await updateTrackerEntry(id, patch)).entry);
      } catch (err) {
        if (before) setEntries(before);
        throw err;
      }
    },
    remove: async (id) => {
      await removeTrackerEntry(id);
      setEntries((list) => (list ?? []).filter((one) => one.id !== id));
    },
    // Takes others from the same sender with it, so the list is read again.
    notJob: async (id) => {
      const outcome = await markNotAJob(id);
      setEntries((await getTracker()).entries ?? []);
      return outcome;
    },
  };
}
