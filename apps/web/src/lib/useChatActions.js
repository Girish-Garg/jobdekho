import { useEffect, useState } from 'react';
import { runPostingAction } from '../api.js';
import { providerFor } from './providerFor.js';
import { ACTION_KINDS } from './chatActionKinds.js';
import { useScopedResults } from './useScopedResults.js';

// The posting actions, run from the chat on the job it is scoped to. Every
// run and refine goes through the panel's runner (useAiRunner.js), so the
// wait and the failure look the same as a plain question's.
//
// `blocked` is the kind the person just asked for that no installed CLI can
// take (a web check with only Antigravity installed): the panel shows the
// install hint for it rather than a call that could only fail. `queue` is
// for the job pane's "Check whether this job is real", which asks before the
// saved answers are known: it runs once they are, and only if nothing of that
// kind was saved, since a verdict already paid for is shown, not bought again.
export function useChatActions(posting, { runner, providers }) {
  const { results, put } = useScopedResults(posting?.id ?? null);
  const [blocked, setBlocked] = useState(null);
  const [queued, setQueued] = useState(null);

  async function start(kind, instruction = '') {
    const meta = ACTION_KINDS[kind];
    if (!posting || !meta) return;
    if (Array.isArray(providers) && !providerFor(providers, meta.policy)) {
      setBlocked(kind);
      return;
    }
    setBlocked(null);
    const job = posting;
    const what = instruction ? { say: instruction, changing: meta.name } : { say: meta.label };
    // Left out entirely for a plain run, which keeps it the bodyless POST it
    // always was (see lib/aiCall.js); with it, the server refines the newest
    // saved answer instead of starting fresh.
    const record = await runner.run({ ...what, noun: meta.noun, doing: meta.doing }, (onEvent) =>
      runPostingAction(job.id, kind, instruction ? { onEvent, instruction } : { onEvent }));
    if (!record) return;
    put(record);
  }

  useEffect(() => {
    if (!queued || runner.busy || results === undefined || queued.postingId !== posting?.id) return;
    setQueued(null);
    if (!results.some((r) => r.kind === queued.kind)) start(queued.kind);
  }, [queued, results, runner.busy, posting?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    results,
    blocked,
    clearBlocked: () => setBlocked(null),
    run: (kind) => start(kind),
    refine: (kind, instruction) => start(kind, instruction),
    queue: (postingId, kind) => setQueued({ postingId, kind }),
  };
}
