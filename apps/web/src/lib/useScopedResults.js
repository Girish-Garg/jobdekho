import { useEffect, useState } from 'react';
import { getPostingAiResults } from '../api.js';

// What the AI actions already answered about the posting the chat is scoped
// to, read once per posting so a verdict or a letter that was paid for shows
// up the moment the chat opens on that job. `results` is undefined while the
// store is being asked, else the list of records { kind, postingId, provider,
// createdAt, result, versions, dropped } (see ai-results.js on the server).
//
// Held with the id it belongs to, so an answer that lands after the person
// has moved to another job is never shown as that other job's.
export function useScopedResults(postingId) {
  const [state, setState] = useState({ postingId: null, list: [] });

  useEffect(() => {
    if (!postingId) {
      setState({ postingId: null, list: [] });
      return undefined;
    }
    let alive = true;
    setState({ postingId, list: undefined });
    getPostingAiResults(postingId)
      // A failed read shows as "nothing saved yet"; the quick actions are the
      // right next step either way.
      .then((list) => alive && setState({ postingId, list }))
      .catch(() => alive && setState({ postingId, list: [] }));
    return () => { alive = false; };
  }, [postingId]);

  // A fresh record replaces the one of its kind, since it carries every
  // version before it (see ai-results.js).
  function put(record) {
    setState((now) => (now.postingId === record.postingId && now.list
      ? { ...now, list: [...now.list.filter((r) => r.kind !== record.kind), record] }
      : now));
  }

  const results = postingId && state.postingId === postingId ? state.list : postingId ? undefined : [];
  return { results, put };
}
