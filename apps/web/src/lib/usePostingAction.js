import { useEffect, useRef, useState } from 'react';
import { runPostingAction, getPostingAiResults } from '../api.js';
import { progressText } from './aiProgress.js';

// One AI action on one posting: the answer already saved for it, a run()
// that asks for a fresh one while narrating the wait, and a refine() that
// asks again with an instruction for what to change about it. Every action
// shares this so that a cover letter and a scam check behave the same way at
// the button: same progress line, same failure sentences, same saved record
// { kind, postingId, provider, createdAt, result, versions, dropped } coming
// back (see ai-results.js on the server for what `versions` holds).
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

  // A plain run and a refine are the same call with or without an
  // instruction; keeping the option out of the request entirely for a plain
  // run is what keeps the bodyless POST a rerun always sent.
  async function execute(instruction) {
    setBusy(true);
    setError(null);
    setProgress('Starting...');
    try {
      setSaved(await runPostingAction(postingId, kind, instruction ? { onEvent, instruction } : { onEvent }));
    } catch (err) {
      setError(err);
    }
    setBusy(false);
  }

  return {
    saved, busy, progress, error,
    run: () => execute(),
    refine: (instruction) => execute(instruction),
    clearError: () => setError(null),
  };
}

// A record from before versions existed carries only its one answer.
// Reading it as a one-entry history is the whole of the client's part in
// that migration: the server already does the same (see ai-results.js), so
// this only has to cover a record a test hands in directly.
export function versionsOf(record) {
  if (!record) return [];
  return record.versions ?? [{ instruction: '', provider: record.provider, createdAt: record.createdAt, result: record.result }];
}
