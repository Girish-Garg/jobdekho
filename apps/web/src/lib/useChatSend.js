import { useState } from 'react';
import { busyIn, entryFor } from './chatStore.js';
import { useDraft } from './chatDrafts.js';
import { localDraft } from './chatDraftSignal.js';
import { ask, queue, runCombined, stopRunning, unqueue } from './chatAsk.js';

// What the box under a chat does, and what its missed card offers.
//
// A message is a question, or with a result card picked as the reply
// target that card's refine. While this chat's own answer runs, a question
// waits as its one follow-up, kept by the server (see chatAsk.js); a refine
// cannot wait, since it is an action, and nothing ever runs later on its
// own. While another chat's call runs, Send waits and the box says why,
// but typing goes on, into this chat's own draft (see chatDrafts.js).
export function useChatSend({ chatKey, view, store, screen, target, job }) {
  const [draft, setDraft] = useDraft(chatKey);
  const [fill, setFill] = useState(null);
  const here = busyIn(chatKey, store);
  const elsewhere = store.busy && !here ? store.busy : null;
  const waiting = entryFor(store.waiting, chatKey, store);
  const failed = entryFor(store.failed, chatKey, store);
  const posting = view?.kind === 'job' ? view.jobs[0] : null;

  function onSend(text) {
    if (target && posting) return job.start(posting.id, target, { instruction: text });
    return ask(chatKey, text, screen);
  }

  // A missed call is asked again the way it was asked the first time.
  function again(missed) {
    const call = missed.call ?? {};
    if (call.kind === 'action') return job.start(call.postingId, call.action, { instruction: call.instruction, askedIn: null });
    if (call.kind === 'combined') return runCombined(chatKey, call.combined);
    return ask(chatKey, missed.question, call.screen ?? screen);
  }

  const asked = !failed?.call?.kind || failed.call.kind === 'question' || failed.call.kind === 'edit';
  return {
    here,
    elsewhere,
    box: {
      value: draft,
      onValue: setDraft,
      draft: chatKey ? fill : null,
      busy: Boolean(here),
      held: Boolean(elsewhere) || !chatKey,
      onSend,
      onQueue: target ? null : (text) => queue(chatKey, text, screen),
      queued: waiting?.message ?? null,
      onUnqueue: () => unqueue(chatKey),
      onStop: here ? stopRunning : null,
    },
    missed: failed ? {
      missed: failed,
      hasDraft: Boolean(draft.trim()),
      onAgain: () => again(failed),
      onEdit: asked ? () => setFill(localDraft(failed.question)) : null,
    } : null,
    // Words put in the box from elsewhere: "Add with AI" on the Profile page.
    fillWith: setFill,
  };
}
