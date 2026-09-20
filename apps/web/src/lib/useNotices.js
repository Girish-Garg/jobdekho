import { useEffect, useRef, useState } from 'react';
import { onNotice } from './toast.js';

// How long a "done" notice stands before it clears itself. An error gets no
// timer at all: it stands until the person dismisses it, since it is the one
// kind still asking something of them.
const DONE_FADE_MS = 5000;

// Keeps the stack ToastHost renders: newest appended, a repeat (the same
// title and detail arriving again - a retry that fails the same way, a
// second probe that finds the same thing missing) bumped onto the notice
// already on screen instead of piling up beside it.
export function useNotices() {
  const [notices, setNotices] = useState([]);
  const timers = useRef({});

  function dismiss(id) {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setNotices((all) => all.filter((n) => n.id !== id));
  }

  useEffect(() => onNotice((notice) => {
    setNotices((all) => {
      const twin = all.find((n) => n.title === notice.title && n.detail === notice.detail);
      const id = twin ? twin.id : notice.id;
      clearTimeout(timers.current[id]);
      if (notice.kind === 'done') timers.current[id] = setTimeout(() => dismiss(id), DONE_FADE_MS);
      const merged = { ...notice, id, count: (twin?.count ?? 0) + 1 };
      return twin ? all.map((n) => (n.id === id ? merged : n)) : [...all, merged];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);

  return { notices, dismiss };
}
