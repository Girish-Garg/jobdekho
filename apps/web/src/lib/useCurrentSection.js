import { useEffect, useRef, useState } from 'react';

// The heading that last crossed a line a third of the way down the window
// is the section being read: a hundred-entry Experience list stays current
// until Projects' heading gets there, which is what an index should say. A
// scroll-spy on positions rather than an IntersectionObserver because the
// last section of a record can never fill an observer's band once the page
// runs out of scroll, so it would never become current at all.
const FOCUS = 1 / 3;

export function useCurrentSection(ids, view = globalThis) {
  const [current, setCurrent] = useState(ids[0] ?? null);
  // A jump scrolls once itself, and that scroll must not re-derive a
  // different answer from the one the click just gave.
  const skipNext = useRef(false);
  const key = ids.join(' ');

  useEffect(() => {
    const list = key ? key.split(' ') : [];
    if (list.length === 0 || !view.document) return undefined;
    setCurrent((was) => (list.includes(was) ? was : list[0]));

    function onScroll() {
      if (skipNext.current) {
        skipNext.current = false;
        return;
      }
      const line = view.innerHeight * FOCUS;
      let found = list[0];
      for (const id of list) {
        const top = view.document.getElementById(id)?.getBoundingClientRect().top;
        if (top != null && top <= line) found = id;
      }
      setCurrent(found);
    }

    // Capture, because scroll does not bubble and the record scrolls inside
    // <main>, not the window.
    view.document.addEventListener('scroll', onScroll, true);
    return () => view.document.removeEventListener('scroll', onScroll, true);
  }, [key, view]);

  function jumpTo(id) {
    setCurrent(id);
    skipNext.current = true;
    // Instant, not smooth: a smooth scroll fires a scroll event per frame and
    // every one would fight the click; and instant already honours
    // reduced-motion without asking.
    view.document?.getElementById(id)?.scrollIntoView?.({ block: 'start' });
  }

  return [current, jumpTo];
}
