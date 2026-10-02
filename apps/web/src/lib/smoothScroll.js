import { effectsLevel } from './effects.js';

const REDUCE = '(prefers-reduced-motion: reduce)';

// A glide is about a fifth of a second for a hop and under half a second for
// the longest haul: long enough for the eye to follow where the page went,
// short enough that a click never feels like waiting. Distance sets the time
// up to LONG_PX, past which more of it is only more blur.
export const MIN_MS = 200;
export const MAX_MS = 450;
const LONG_PX = 2400;

export const scrollDuration = (distance) => MIN_MS + (MAX_MS - MIN_MS) * Math.min(1, Math.abs(distance) / LONG_PX);

// Quick off the mark, so the click is answered at once, then slowing onto the
// section. Gentler than --ease-out (index.css), which has covered nearly all
// of a distance by halfway and would read as a cut with a tail on a page this
// big.
export const easeOut = (t) => 1 - (1 - t) ** 3;

// What means the person has reached for the page. A press on the scrollbar is
// a pointer and neither a wheel nor a touch, so that is listed too. They are
// heard on the document in the capture phase, as the scroll spy is, so
// whatever the page does with the event it still arrives.
const TAKEOVER = ['wheel', 'touchstart', 'keydown', 'pointerdown'];

// Whether a jump may move the page at all. Not when the system asks for less
// motion (that wins even over a picked 'full', since a page sliding under the
// eyes is what the setting is for), and not when the app's own effects are
// off. Where matchMedia is missing (jsdom, an old engine) there is no way to
// ask, so the answer is no, as in useCountUp.
export function motionAllowed(view) {
  const media = view.matchMedia?.(REDUCE);
  return Boolean(media) && !media.matches && effectsLevel(view.document) !== 'off';
}

// Scrolls `box` to `to` with an ease-out, in the time the distance deserves.
// It gives way the moment the person reaches for the page, so their wheel is
// never fought. The returned function ends it where it stands.
//
// `onEnd` runs once however it ends, and never before this call has returned.
// After a landing it waits a frame: the scroll event the last write caused is
// delivered at the top of the next frame, ahead of that frame's callbacks, so
// a scroll listener that stands down until `onEnd` never sees the tail of the
// glide. Time comes from the frames' own stamps and starts at the first, which
// can be stamped a hair before the click that asked for it, so nothing jumps
// on the way in.
export function smoothScroll(box, to, { view = globalThis, onEnd } = {}) {
  const from = box.scrollTop;
  const ms = scrollDuration(to - from);
  const doc = view.document;
  let frame = 0;
  let start = null;
  let over = false;

  function end() {
    if (over) return;
    over = true;
    view.cancelAnimationFrame(frame);
    for (const type of TAKEOVER) doc.removeEventListener(type, end, true);
    onEnd?.();
  }

  function step(now) {
    if (over) return;
    start ??= now;
    const t = Math.min(1, (now - start) / ms);
    box.scrollTop = t < 1 ? from + (to - from) * easeOut(t) : to;
    frame = view.requestAnimationFrame(t < 1 ? step : end);
  }

  for (const type of TAKEOVER) doc.addEventListener(type, end, { capture: true, passive: true });
  frame = view.requestAnimationFrame(step);
  return end;
}
