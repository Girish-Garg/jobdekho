import { useEffect, useRef, useState } from 'react';
import { motionAllowed, smoothScroll } from './smoothScroll.js';
import { landingTop, scrollParent } from './scrollTarget.js';

// The heading that last crossed a line a third of the way down the window
// is the section being read: a hundred-entry Experience list stays current
// until Projects' heading gets there, which is what an index should say. A
// scroll-spy on positions rather than an IntersectionObserver because the
// last section of a record can never fill an observer's band once the page
// runs out of scroll, so it would never become current at all.
const FOCUS = 1 / 3;

export function useCurrentSection(ids, view = globalThis) {
  const [current, setCurrent] = useState(ids[0] ?? null);
  // An instant jump scrolls once itself, and that scroll must not re-derive a
  // different answer from the one the click just gave.
  const skipNext = useRef(false);
  // The stop function of the glide a click started, for as long as it runs.
  const glide = useRef(null);
  const key = ids.join(' ');

  useEffect(() => {
    const list = key ? key.split(' ') : [];
    if (list.length === 0 || !view.document) return undefined;
    setCurrent((was) => (list.includes(was) ? was : list[0]));

    function onScroll() {
      if (glide.current) return;
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

  // A glide must not outlive the page that started it.
  useEffect(() => () => glide.current?.(), []);

  function jumpTo(id) {
    setCurrent(id);
    // A second click takes over from a glide still running instead of queueing
    // behind it, and drops a skip an earlier jump left armed without having
    // scrolled anything, which would swallow the person's next scroll.
    glide.current?.();
    skipNext.current = false;
    const el = view.document?.getElementById(id);
    if (!el) return;
    // Animated, and quick (see smoothScroll.js): a section that snaps into
    // place reads as a cut, and a short glide lets the eye follow where the
    // page went. Every frame of a glide fires a scroll event, and the spy
    // would mark each section the page passes on the way, so it stands down
    // until the glide ends or the person takes the page over, and the clicked
    // entry stays marked throughout. Where motion is off the jump stays
    // instant, and that fires a single scroll event, which is skipped instead.
    const box = motionAllowed(view) ? scrollParent(el, view) : null;
    if (!box) {
      skipNext.current = true;
      el.scrollIntoView?.({ block: 'start' });
      return;
    }
    const to = landingTop(el, box, view);
    if (Math.abs(to - box.scrollTop) < 1) return;
    glide.current = smoothScroll(box, to, { view, onEnd: () => { glide.current = null; } });
  }

  return [current, jumpTo];
}
