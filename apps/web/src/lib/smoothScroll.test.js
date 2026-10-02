import { describe, it, expect, vi } from 'vitest';
import { smoothScroll, scrollDuration, easeOut, motionAllowed, MIN_MS, MAX_MS } from './smoothScroll.js';
import { frameClock } from '../test/frameClock.js';

// What a glide uses of a window: frames to draw on, and a document to hear the
// person reach for the page on. An element is a real event target in jsdom.
function stage() {
  const clock = frameClock();
  const doc = document.createElement('div');
  const view = { document: doc, requestAnimationFrame: clock.requestAnimationFrame, cancelAnimationFrame: clock.cancelAnimationFrame };
  return { view, clock, doc };
}

// A scroll box that remembers every position it was put at.
function box(top = 0) {
  const writes = [];
  let value = top;
  return {
    writes,
    get scrollTop() {
      return value;
    },
    set scrollTop(next) {
      value = next;
      writes.push(next);
    },
  };
}

const TAKEOVER = ['wheel', 'touchstart', 'keydown', 'pointerdown'];

describe('scrollDuration', () => {
  it('is 200ms for a hop and 450ms from a long haul on, with nothing outside that', () => {
    expect(MIN_MS).toBe(200);
    expect(MAX_MS).toBe(450);
    expect(scrollDuration(0)).toBe(MIN_MS);
    expect(scrollDuration(2400)).toBe(MAX_MS);
    expect(scrollDuration(50000)).toBe(MAX_MS);
    for (let distance = -6000; distance <= 6000; distance += 250) {
      expect(scrollDuration(distance)).toBeGreaterThanOrEqual(MIN_MS);
      expect(scrollDuration(distance)).toBeLessThanOrEqual(MAX_MS);
    }
  });

  it('grows with the distance, the same going up as going down', () => {
    expect(scrollDuration(1200)).toBe(325);
    expect(scrollDuration(-1200)).toBe(325);
    expect(scrollDuration(300)).toBeLessThan(scrollDuration(1200));
    expect(scrollDuration(1200)).toBeLessThan(scrollDuration(2400));
  });
});

describe('easeOut', () => {
  it('runs from nothing to everything, quick at first', () => {
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBe(1);
    expect(easeOut(0.5)).toBe(0.875);
  });

  it('covers less ground in each equal slice of time than in the one before', () => {
    const slices = [];
    for (let i = 0; i < 10; i += 1) slices.push(easeOut((i + 1) / 10) - easeOut(i / 10));
    for (let i = 1; i < slices.length; i += 1) expect(slices[i]).toBeLessThan(slices[i - 1]);
  });
});

describe('smoothScroll', () => {
  it('lands exactly on the target, starting where the page was', () => {
    const { view, clock } = stage();
    const b = box(100);
    smoothScroll(b, 1100, { view });
    clock.settle();
    expect(b.scrollTop).toBe(1100);
    expect(b.writes[0]).toBe(100);
    expect(b.writes.at(-1)).toBe(1100);
  });

  it('eases out: every frame covers no more than the one before', () => {
    const { view, clock } = stage();
    const b = box(100);
    smoothScroll(b, 1100, { view });
    clock.settle();
    const steps = b.writes.slice(1).map((value, i) => value - b.writes[i]);
    expect(steps.length).toBeGreaterThan(8);
    for (let i = 0; i < steps.length; i += 1) {
      expect(steps[i]).toBeGreaterThan(0);
      if (i > 0) expect(steps[i]).toBeLessThanOrEqual(steps[i - 1]);
    }
  });

  it('goes upward the same way', () => {
    const { view, clock } = stage();
    const b = box(1100);
    smoothScroll(b, 100, { view });
    clock.settle();
    const steps = b.writes.slice(1).map((value, i) => value - b.writes[i]);
    expect(steps.every((step) => step < 0)).toBe(true);
    expect(b.scrollTop).toBe(100);
  });

  it('starts its time at the first frame, however late that comes, so nothing jumps', () => {
    const { view, clock } = stage();
    const b = box(0);
    smoothScroll(b, 1000, { view });
    clock.frame(900);
    expect(b.writes).toEqual([0]);
    clock.frame();
    expect(b.scrollTop).toBeGreaterThan(0);
    expect(b.scrollTop).toBeLessThan(1000);
  });

  // The first frame is the start, so the landing frame is the first one
  // whose time since it has reached the duration.
  it.each([300, 1200, 5000])('takes the time %ipx deserves', (distance) => {
    const { view, clock } = stage();
    const b = box(0);
    smoothScroll(b, distance, { view });
    let frames = 0;
    while (b.scrollTop !== distance && frames < 100) {
      clock.frame();
      frames += 1;
    }
    const took = (frames - 1) * 16;
    expect(took).toBeGreaterThanOrEqual(scrollDuration(distance));
    expect(took).toBeLessThan(scrollDuration(distance) + 16);
  });

  it('reports the end once, a frame after the landing', () => {
    const { view, clock } = stage();
    const onEnd = vi.fn();
    const b = box(0);
    smoothScroll(b, 500, { view, onEnd });
    for (let i = 0; i < 100 && b.scrollTop !== 500; i += 1) clock.frame();
    expect(b.scrollTop).toBe(500);
    expect(onEnd).not.toHaveBeenCalled();
    clock.frame();
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(clock.waiting).toBe(0);
    clock.frames(5);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it.each(TAKEOVER)('gives way the moment a %s arrives, leaving the page where it is', (type) => {
    const { view, clock, doc } = stage();
    const onEnd = vi.fn();
    const b = box(0);
    smoothScroll(b, 2000, { view, onEnd });
    clock.frames(5);
    const where = b.scrollTop;
    expect(where).toBeGreaterThan(0);
    doc.dispatchEvent(new Event(type));
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(clock.waiting).toBe(0);
    clock.frames(10);
    expect(b.scrollTop).toBe(where);
    doc.dispatchEvent(new Event(type));
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  // The press lands on whatever is under the pointer, and a handler on the
  // way down may stop it bubbling; the capture phase at the document is first.
  it('hears the person even where something below the document stops the event', () => {
    const { view, clock, doc } = stage();
    const target = doc.appendChild(document.createElement('button'));
    target.addEventListener('wheel', (event) => event.stopPropagation());
    const onEnd = vi.fn();
    smoothScroll(box(0), 2000, { view, onEnd });
    clock.frames(3);
    target.dispatchEvent(new Event('wheel', { bubbles: true }));
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('can be ended by hand where it stands, once', () => {
    const { view, clock } = stage();
    const onEnd = vi.fn();
    const b = box(0);
    const stop = smoothScroll(b, 2000, { view, onEnd });
    clock.frames(5);
    const where = b.scrollTop;
    stop();
    stop();
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(clock.waiting).toBe(0);
    clock.frames(10);
    expect(b.scrollTop).toBe(where);
  });

  it('listens for the person only while it runs', () => {
    const { view, clock, doc } = stage();
    const add = vi.spyOn(doc, 'addEventListener');
    const remove = vi.spyOn(doc, 'removeEventListener');
    smoothScroll(box(0), 500, { view });
    for (const type of TAKEOVER) expect(add).toHaveBeenCalledWith(type, expect.any(Function), { capture: true, passive: true });
    expect(remove).not.toHaveBeenCalled();
    clock.settle();
    for (const type of TAKEOVER) expect(remove).toHaveBeenCalledWith(type, expect.any(Function), true);
    expect(remove).toHaveBeenCalledTimes(TAKEOVER.length);
  });
});

describe('motionAllowed', () => {
  const viewOf = ({ matches, effects } = {}) => ({
    matchMedia: matches === undefined ? undefined : vi.fn(() => ({ matches })),
    document: { documentElement: { dataset: effects ? { effects } : {} } },
  });

  it('allows motion when nothing asks for less', () => {
    expect(motionAllowed(viewOf({ matches: false }))).toBe(true);
    expect(motionAllowed(viewOf({ matches: false, effects: 'full' }))).toBe(true);
    // Light drops what repaints with the pointer, not a short scroll.
    expect(motionAllowed(viewOf({ matches: false, effects: 'light' }))).toBe(true);
  });

  it('refuses when the system asks for reduced motion, even over a picked full', () => {
    const view = viewOf({ matches: true });
    expect(motionAllowed(view)).toBe(false);
    expect(view.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    expect(motionAllowed(viewOf({ matches: true, effects: 'full' }))).toBe(false);
  });

  it('refuses when the app\'s effects are off', () => {
    expect(motionAllowed(viewOf({ matches: false, effects: 'off' }))).toBe(false);
  });

  it('refuses where there is no way to ask', () => {
    expect(motionAllowed(viewOf())).toBe(false);
  });
});
