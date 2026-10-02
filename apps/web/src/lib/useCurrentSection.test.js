import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCurrentSection } from './useCurrentSection.js';
import { frameClock } from '../test/frameClock.js';

const IDS = ['profile-basics', 'profile-experience', 'profile-projects'];

// jsdom lays nothing out, so each section's top is whatever the test says.
function placeSections(tops) {
  for (const [id, top] of Object.entries(tops)) {
    const el = document.createElement('section');
    el.id = id;
    el.getBoundingClientRect = () => ({ top });
    el.scrollIntoView = vi.fn();
    document.body.appendChild(el);
  }
}

const scroll = () => act(() => { document.dispatchEvent(new Event('scroll')); });

beforeEach(() => { window.innerHeight = 900; });
afterEach(() => { document.body.innerHTML = ''; });

describe('useCurrentSection', () => {
  it('starts on the first section, and on nothing when there are no sections', () => {
    expect(renderHook(() => useCurrentSection(IDS)).result.current[0]).toBe('profile-basics');
    expect(renderHook(() => useCurrentSection([])).result.current[0]).toBeNull();
  });

  it('marks the last section whose top has crossed a third of the window', () => {
    placeSections({ 'profile-basics': -400, 'profile-experience': 120, 'profile-projects': 700 });
    const { result } = renderHook(() => useCurrentSection(IDS));
    scroll();
    expect(result.current[0]).toBe('profile-experience');
  });

  it('keeps a tall section current until the next heading gets there', () => {
    placeSections({ 'profile-basics': -900, 'profile-experience': -500, 'profile-projects': 320 });
    const { result } = renderHook(() => useCurrentSection(IDS));
    scroll();
    expect(result.current[0]).toBe('profile-experience');
  });

  it('falls back to the first section when nothing has crossed the line yet', () => {
    placeSections({ 'profile-basics': 400, 'profile-experience': 800, 'profile-projects': 1200 });
    const { result } = renderHook(() => useCurrentSection(IDS));
    scroll();
    expect(result.current[0]).toBe('profile-basics');
  });

  it('jumps by scrolling the section to the top and marking it, ignoring the scroll that jump causes', () => {
    placeSections({ 'profile-basics': 0, 'profile-experience': 500, 'profile-projects': 1000 });
    const { result } = renderHook(() => useCurrentSection(IDS));
    act(() => result.current[1]('profile-projects'));
    expect(document.getElementById('profile-projects').scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    expect(result.current[0]).toBe('profile-projects');
    // The positions above still say Basics; the one scroll a jump fires
    // must not undo the click, but the next real scroll is read as usual.
    scroll();
    expect(result.current[0]).toBe('profile-projects');
    scroll();
    expect(result.current[0]).toBe('profile-basics');
  });

  it('follows the sections when the list changes and drops a current that vanished', () => {
    const { result, rerender } = renderHook(({ ids }) => useCurrentSection(ids), { initialProps: { ids: IDS } });
    act(() => result.current[1]('profile-projects'));
    rerender({ ids: ['profile-basics', 'profile-experience'] });
    expect(result.current[0]).toBe('profile-basics');
  });

  it('stops listening once unmounted', () => {
    const remove = vi.spyOn(document, 'removeEventListener');
    const { unmount } = renderHook(() => useCurrentSection(IDS));
    unmount();
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function), true);
    remove.mockRestore();
  });
});

// A click that glides, on a page laid out the way a browser would: <main>
// scrolls, the sections sit at fixed places in its content, and where one is
// on screen follows how far <main> has scrolled. jsdom lays nothing out, so
// every number here is the test's. Skills sits right under Projects, so a page
// landed on Projects already reads as Skills to the spy: the case where a mark
// that gave way to the spy would visibly flip.
const MAIN_TOP = 56;
const GLIDE_IDS = [...IDS, 'profile-skills'];
const CONTENT_TOPS = { 'profile-basics': 0, 'profile-experience': 900, 'profile-projects': 2400, 'profile-skills': 2500 };

function layOutPage() {
  const main = document.createElement('main');
  main.style.setProperty('overflow-y', 'auto');
  Object.defineProperty(main, 'scrollHeight', { value: 3600 });
  Object.defineProperty(main, 'clientHeight', { value: 800 });
  main.getBoundingClientRect = () => ({ top: MAIN_TOP });
  for (const [id, top] of Object.entries(CONTENT_TOPS)) {
    const el = document.createElement('section');
    el.id = id;
    el.style.setProperty('scroll-margin-top', '16px');
    el.getBoundingClientRect = () => ({ top: MAIN_TOP + top - main.scrollTop });
    el.scrollIntoView = vi.fn();
    main.appendChild(el);
  }
  document.body.appendChild(main);
  return main;
}

// The window the hook is handed: the real document and events, with the frames
// and the reduced-motion question in the test's hands.
function windowWith(clock, { reduce = false } = {}) {
  return {
    document,
    innerHeight: 900,
    matchMedia: () => ({ matches: reduce }),
    getComputedStyle: (el) => window.getComputedStyle(el),
    requestAnimationFrame: clock.requestAnimationFrame,
    cancelAnimationFrame: clock.cancelAnimationFrame,
  };
}

describe('useCurrentSection when a click glides', () => {
  let main;
  let clock;
  let view;
  let reported;
  const mount = () => renderHook(() => useCurrentSection(GLIDE_IDS, view));
  const click = (hook, id) => act(() => hook.result.current[1](id));
  const scrolled = () => act(() => { main.dispatchEvent(new Event('scroll')); });
  const section = (id) => document.getElementById(id);
  // A frame the way a browser runs one: the scroll event for whatever the
  // last frame moved is delivered first, then the frame's own callbacks run.
  // Nothing moves after the last write, so no event follows the frame that
  // ends the glide.
  const playFrame = () => {
    if (main.scrollTop !== reported) {
      reported = main.scrollTop;
      scrolled();
    }
    clock.frame();
  };

  beforeEach(() => {
    main = layOutPage();
    clock = frameClock();
    view = windowWith(clock);
    reported = 0;
  });
  afterEach(() => {
    delete document.documentElement.dataset.effects;
    delete document.scrollingElement;
    delete document.documentElement.scrollHeight;
    delete document.documentElement.clientHeight;
    document.documentElement.scrollTop = 0;
  });

  it('marks the clicked entry at once and eases <main> toward it, without a jump', () => {
    const hook = mount();
    click(hook, 'profile-projects');
    expect(hook.result.current[0]).toBe('profile-projects');
    expect(main.scrollTop).toBe(0);
    expect(section('profile-projects').scrollIntoView).not.toHaveBeenCalled();
    clock.frames(3);
    expect(main.scrollTop).toBeGreaterThan(0);
    expect(main.scrollTop).toBeLessThan(2384);
  });

  it('lands each section where the instant jump put it, its scroll margin included', () => {
    const hook = mount();
    click(hook, 'profile-projects');
    clock.settle();
    expect(main.scrollTop).toBe(2400 - 16);
    click(hook, 'profile-experience');
    clock.settle();
    expect(main.scrollTop).toBe(900 - 16);
    // The first section's margin would aim above the top of the page.
    click(hook, 'profile-basics');
    clock.settle();
    expect(main.scrollTop).toBe(0);
  });

  it('keeps the clicked entry marked through every section the page passes on the way', () => {
    const hook = mount();
    click(hook, 'profile-projects');
    const marked = new Set();
    for (let i = 0; i < 60 && clock.waiting; i += 1) {
      playFrame();
      marked.add(hook.result.current[0]);
    }
    expect(main.scrollTop).toBe(2384);
    expect([...marked]).toEqual(['profile-projects']);
  });

  it('holds the mark through the scroll event the last write causes, then lets the spy take over', () => {
    const hook = mount();
    click(hook, 'profile-projects');
    for (let i = 0; i < 60 && main.scrollTop !== 2384; i += 1) clock.frame();
    expect(main.scrollTop).toBe(2384);
    // A browser delivers that event ahead of the next frame's callbacks.
    scrolled();
    expect(hook.result.current[0]).toBe('profile-projects');
    clock.frame();
    expect(clock.waiting).toBe(0);
    // The glide is over; the next scroll is read from the positions again,
    // and with Projects at the top, Skills is what has crossed the line.
    scrolled();
    expect(hook.result.current[0]).toBe('profile-skills');
  });

  it.each([
    ['wheel', () => new WheelEvent('wheel', { bubbles: true })],
    ['touchstart', () => new Event('touchstart', { bubbles: true })],
    ['keydown', () => new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })],
    ['pointerdown', () => new Event('pointerdown', { bubbles: true })],
  ])('hands the page back on a %s, and the spy takes over where it was left', (type, make) => {
    const hook = mount();
    click(hook, 'profile-projects');
    clock.frames(4);
    const where = main.scrollTop;
    expect(where).toBeGreaterThan(0);
    act(() => { main.dispatchEvent(make()); });
    expect(clock.waiting).toBe(0);
    clock.frames(10);
    expect(main.scrollTop).toBe(where);
    scrolled();
    expect(hook.result.current[0]).toBe('profile-experience');
  });

  it('lets a second click take over from the first, and keeps the new mark through its glide', () => {
    const hook = mount();
    click(hook, 'profile-projects');
    clock.frames(7);
    click(hook, 'profile-skills');
    expect(hook.result.current[0]).toBe('profile-skills');
    const marked = new Set();
    for (let i = 0; i < 60 && clock.waiting; i += 1) {
      playFrame();
      marked.add(hook.result.current[0]);
    }
    expect(main.scrollTop).toBe(2484);
    expect([...marked]).toEqual(['profile-skills']);
  });

  it('does nothing for a section the page is already at, and leaves no scroll to skip', () => {
    const hook = mount();
    main.scrollTop = 884;
    click(hook, 'profile-experience');
    expect(clock.waiting).toBe(0);
    expect(section('profile-experience').scrollIntoView).not.toHaveBeenCalled();
    expect(hook.result.current[0]).toBe('profile-experience');
    main.scrollTop = 0;
    scrolled();
    expect(hook.result.current[0]).toBe('profile-basics');
  });

  it('stops a glide in flight when the page goes away', () => {
    const remove = vi.spyOn(document, 'removeEventListener');
    const hook = mount();
    click(hook, 'profile-projects');
    clock.frames(3);
    const where = main.scrollTop;
    hook.unmount();
    expect(clock.waiting).toBe(0);
    clock.frames(5);
    expect(main.scrollTop).toBe(where);
    expect(remove).toHaveBeenCalledWith('wheel', expect.any(Function), true);
    remove.mockRestore();
  });

  it('glides the page itself where no box inside it scrolls', () => {
    const root = document.documentElement;
    main.remove();
    Object.defineProperties(root, {
      scrollHeight: { value: 3600, configurable: true },
      clientHeight: { value: 900, configurable: true },
    });
    Object.defineProperty(document, 'scrollingElement', { value: root, configurable: true });
    for (const [id, top] of Object.entries(CONTENT_TOPS)) {
      const el = document.createElement('section');
      el.id = id;
      el.style.setProperty('scroll-margin-top', '16px');
      el.getBoundingClientRect = () => ({ top: top - root.scrollTop });
      document.body.appendChild(el);
    }
    const hook = mount();
    click(hook, 'profile-projects');
    clock.settle();
    expect(root.scrollTop).toBe(2400 - 16);
  });

  describe('where motion is not wanted', () => {
    // The jump is the instant one it always was: the section scrolled to the
    // top by the browser, the one scroll event that causes skipped.
    function expectInstant(hook) {
      click(hook, 'profile-projects');
      expect(section('profile-projects').scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
      expect(clock.waiting).toBe(0);
      expect(main.scrollTop).toBe(0);
      expect(hook.result.current[0]).toBe('profile-projects');
      scrolled();
      expect(hook.result.current[0]).toBe('profile-projects');
      scrolled();
      expect(hook.result.current[0]).toBe('profile-basics');
    }

    it('jumps instantly when the system asks for reduced motion', () => {
      view = windowWith(clock, { reduce: true });
      expectInstant(mount());
    });

    it('jumps instantly when the app\'s effects are off, though the system allows motion', () => {
      document.documentElement.dataset.effects = 'off';
      expectInstant(mount());
    });

    it('still glides under light effects', () => {
      document.documentElement.dataset.effects = 'light';
      const hook = mount();
      click(hook, 'profile-projects');
      expect(clock.waiting).toBe(1);
      expect(section('profile-projects').scrollIntoView).not.toHaveBeenCalled();
    });
  });
});
