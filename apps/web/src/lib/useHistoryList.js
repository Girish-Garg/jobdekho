import { useEffect, useState } from 'react';

// One of History's two lists (the conversations filed away, or what the AI
// made), read fresh each time History opens: both change as the person
// works, and neither is large. `items` is undefined while the read is in
// flight and [] after a failed one, with `failed` set so the panel says the
// list did not load rather than that there is nothing in it.
export function useHistoryList(read) {
  const [items, setItems] = useState(undefined);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    read()
      .then((found) => alive && setItems(Array.isArray(found) ? found : []))
      .catch(() => {
        if (!alive) return;
        setItems([]);
        setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // A conversation deleted from its reader leaves the list at once.
  const forget = (id) => setItems((now) => (now ?? []).filter((item) => item.id !== id));

  return { items, failed, forget };
}
