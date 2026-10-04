import { useEffect, useState } from 'react';
import { cachedDetail, loadDetail, describeDetail, describeRefusal, hasText } from './postingDetails.js';

// What the pane knows of one posting beyond its feed row:
//
//   status   loading     the posting whole is on its way
//            describing  it came with no description, which is being
//                        fetched once (see postingDetails.js)
//            ready       nothing more is coming
//            failed      the posting did not load
//   detail   the posting whole, once it arrived
//   refusal  { status, message } when its description could not be fetched
function settled(id) {
  const detail = cachedDetail(id);
  if (detail === undefined) return { id, status: 'loading', detail: null, refusal: null };
  if (hasText(detail)) return { id, status: 'ready', detail, refusal: null };
  const refusal = describeRefusal(id);
  return { id, status: refusal ? 'ready' : 'describing', detail, refusal };
}

export function usePostingDetail(id) {
  const [state, setState] = useState(() => settled(id));

  useEffect(() => {
    const now = settled(id);
    setState(now);
    if (now.status === 'ready') return undefined;
    let live = true;
    const set = (next) => live && setState({ id, refusal: null, ...next });
    loadDetail(id).then((detail) => {
      const refusal = hasText(detail) ? null : describeRefusal(id);
      if (hasText(detail) || refusal) return set({ status: 'ready', detail, refusal });
      set({ status: 'describing', detail });
      return describeDetail(id).then(
        (described) => set({ status: 'ready', detail: described }),
        (refusal) => set({ status: 'ready', detail, refusal }),
      );
    }, () => set({ status: 'failed', detail: null }));
    return () => { live = false; };
  }, [id]);

  // Between a switch of posting and the effect above, the state still holds
  // the last posting's; never show it under this one's title.
  return state.id === id ? state : settled(id);
}
