import { useEffect } from 'react';
import { takeRequest } from './askAiSignal.js';
import { pick } from './activeChat.js';
import { chatStore, pageOf } from './chatStore.js';
import { loadPage } from './chatPages.js';

// "Ask AI about this job" and its quick actions, from the job pane (see
// askAiSignal.js), handled once however often the panel mounts.
//
// The job's own chat comes on screen, and an action runs there unless one
// of that kind already shows in it: a verdict paid for is shown, not bought
// again. With the pin on and a comparison or a document's chat on screen
// that holds the job, the action is pressed from there instead: it runs in
// the job's own chat, the chat on screen keeps a note of it, and nothing
// moves. Nothing runs later on its own: an action that finds another call
// running by the time the job's chat is read is dropped, as the pane's own
// buttons would have been.
export function usePaneRequest(request, { chatId, pinned, start }) {
  useEffect(() => {
    if (!takeRequest(request)) return;
    const { posting, action } = request;
    const here = pageOf(chatId)?.chat;
    if (action && pinned && here?.kind !== 'job' && here?.jobs?.some((job) => job.id === posting.id)) {
      start(posting.id, action, { askedIn: here.id });
      return;
    }
    const home = `job:${posting.id}`;
    pick(home);
    if (!action) return;
    loadPage(home).then((page) => {
      if (!page || chatStore.get().busy) return;
      if (!page.results.some((record) => record.kind === action)) start(posting.id, action);
    });
  }, [request]); // eslint-disable-line react-hooks/exhaustive-deps
}
