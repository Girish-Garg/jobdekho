import { useEffect, useRef, useState } from 'react';
import { runPostingAction, getPostingAiResults } from '../api.js';
import { progressText } from './aiProgress.js';

// One AI action on one posting: the answer already saved for it, and a run()
// that asks for a fresh one while narrating the wait. Every action shares
// this so that a cover letter and a scam check behave the same way at the
// button: same progress line, same failure sentences, same saved record
// { kind, postingId, provider, createdAt, result } coming back.
//
// `saved` is undefined while the store is being asked, null when it has
// nothing, else the record. `providers` is the list from useProviders, used
// only to turn the id in the start event into the CLI's name.
export function usePostingAction({ postingId, kind, providers, noun, doing }) {
  const [saved, setSaved] = useState(undefined);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState(null);
  // Only the start event names the CLI, so its label is kept for the rest.
  const label = useRef('');

  useEffect(() => {
    let alive = true;
    setSaved(undefined);
    getPostingAiResults(postingId)
      .then((results) => alive && setSaved(results.find((r) => r.kind === kind) ?? null))
      // A failed read shows as "nothing saved yet"; the run button is the
      // right next step either way.
      .catch(() => alive && setSaved(null));
    return () => {
      alive = false;
    };
  }, [postingId, kind]);

  function onEvent(event) {
    if (event.event === 'start') {
      label.current = providers.find((p) => p.id === event.provider)?.label ?? event.provider;
    }
    setProgress(progressText(event, label.current, { noun, doing }));
  }

  async function run() {
    setBusy(true);
    setError(null);
    setProgress('Starting...');
    try {
      setSaved(await runPostingAction(postingId, kind, { onEvent }));
    } catch (err) {
      setError(err);
    }
    setBusy(false);
  }

  return { saved, busy, progress, error, run, clearError: () => setError(null) };
}
