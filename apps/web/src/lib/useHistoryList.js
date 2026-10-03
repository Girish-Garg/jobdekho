import { useEffect, useState } from 'react';

// A list read fresh each time the menu holding it opens ("Made by AI" on
// the Resume page): it changes as the person works, and it is not large.
// `items` is undefined while the read is in flight and [] after a failed
// one, with `failed` set so the menu says the list did not load rather than
// that there is nothing in it.
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

  return { items, failed };
}
