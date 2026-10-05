import { useEffect, useRef, useState } from 'react';
import { extractProfile } from '../api.js';
import { fillLine } from './reviewText.js';

// How long the finished checklist stays, every step ticked, before the card
// goes back to its button.
const HOLD_MS = 900;

const STOPPED = 'Stopped. Nothing was changed.';

// One run of Fill in from resume, from the press to the review: the step
// the card is on ('idle', 'pick', 'busy', 'done'), the call's events for
// its checklist, a failure to show, and what the run came to. `waits` on
// the outcome marks a line about a review, which says nothing once that
// review is gone; the others stand until the next run.
//
// A Stop, or the card going away mid-run (another page, a closed tab),
// drops the request, and the server stops the CLI the moment nobody is
// waiting for its answer (see its api/profile.js). Nothing was written
// either way, since the run writes nothing until the person keeps it.
export function useFillRun({ providers, onFound }) {
  const [step, setStep] = useState('idle');
  const [run, setRun] = useState(null);
  const [error, setError] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const control = useRef(null);

  useEffect(() => () => control.current?.abort(), []);

  useEffect(() => {
    if (step !== 'done') return undefined;
    const id = setTimeout(() => setStep('idle'), HOLD_MS);
    return () => clearTimeout(id);
  }, [step]);

  // Only the start event names the CLI that answers, which can be another
  // one than expected when the first is signed out (see ai/fallback.js).
  const labelOf = (id) => providers?.find((p) => p.id === id)?.label ?? id;
  const take = (event) => setRun((was) => ({ ...was, events: [...was.events, event], label: event.event === 'start' ? labelOf(event.provider) : was.label }));

  async function read(mode, label) {
    control.current = new AbortController();
    setStep('busy');
    setError(null);
    setOutcome(null);
    setRun({ events: [], label, startedAt: Date.now() });
    try {
      const review = onFound(await extractProfile({ onEvent: take, signal: control.current.signal }), mode);
      setOutcome({ text: fillLine(review), waits: review.rows.length > 0 });
      setStep('done');
    } catch (err) {
      if (err.kind === 'stopped') setOutcome({ text: STOPPED, waits: false });
      else setError(err);
      setStep('idle');
    }
  }

  const stop = () => control.current?.abort();

  return { step, setStep, run, error, setError, outcome, read, stop };
}
