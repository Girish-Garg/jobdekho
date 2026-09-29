import { useEffect, useState } from 'react';
import { cachedDescription, loadDescription } from './fullDescription.js';

const settled = (id) => {
  const text = cachedDescription(id);
  return text === undefined ? { id, text: null, status: 'loading' } : { id, text, status: 'ready' };
};

// The text the pane shows for one posting: the snippet the feed row already
// carries as the first paint, then the full body once it arrives. `status`
// is loading, ready or failed; `text` is null until ready, and '' when the
// posting has no full body stored.
export function useFullDescription(id) {
  const [state, setState] = useState(() => settled(id));

  useEffect(() => {
    const now = settled(id);
    setState(now);
    if (now.status === 'ready') return undefined;
    let live = true;
    loadDescription(id).then(
      (text) => live && setState({ id, text, status: 'ready' }),
      () => live && setState({ id, text: null, status: 'failed' }),
    );
    return () => { live = false; };
  }, [id]);

  // Between a switch of posting and the effect above, the state still holds
  // the last posting's text; never show it under this one's title.
  return state.id === id ? state : settled(id);
}
