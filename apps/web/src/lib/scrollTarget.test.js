import { describe, it, expect, afterEach } from 'vitest';
import { scrollParent, landingTop } from './scrollTarget.js';

afterEach(() => { document.body.innerHTML = ''; });

// jsdom lays nothing out, so a box's numbers are whatever the test says.
function scroller({ top = 0, scrollTop = 0, scrollHeight = 3000, clientHeight = 800, clientTop = 0, overflow = 'auto', padding } = {}) {
  const el = document.createElement('div');
  el.style.setProperty('overflow-y', overflow);
  if (padding) el.style.setProperty('scroll-padding-top', padding);
  Object.defineProperties(el, {
    scrollHeight: { value: scrollHeight, configurable: true },
    clientHeight: { value: clientHeight, configurable: true },
    clientTop: { value: clientTop, configurable: true },
  });
  el.scrollTop = scrollTop;
  el.getBoundingClientRect = () => ({ top });
  return el;
}

function sectionIn(parent, { top, margin } = {}) {
  const el = document.createElement('section');
  if (margin) el.style.setProperty('scroll-margin-top', margin);
  el.getBoundingClientRect = () => ({ top });
  parent.appendChild(el);
  return el;
}

describe('scrollParent', () => {
  it('is the nearest ancestor that scrolls', () => {
    const outer = scroller();
    const inner = scroller();
    outer.appendChild(inner);
    document.body.appendChild(outer);
    expect(scrollParent(sectionIn(inner), window)).toBe(inner);
  });

  it('counts overflow scroll as well as auto', () => {
    const el = scroller({ overflow: 'scroll' });
    document.body.appendChild(el);
    expect(scrollParent(sectionIn(el), window)).toBe(el);
  });

  it('passes over a box that could scroll but has nothing to scroll', () => {
    const outer = scroller();
    const roomy = scroller({ scrollHeight: 800, clientHeight: 800 });
    outer.appendChild(roomy);
    document.body.appendChild(outer);
    expect(scrollParent(sectionIn(roomy), window)).toBe(outer);
  });

  it('passes over a box that clips or shows its overflow instead of scrolling it', () => {
    const outer = scroller();
    const hidden = scroller({ overflow: 'hidden' });
    const visible = scroller({ overflow: 'visible' });
    hidden.appendChild(visible);
    outer.appendChild(hidden);
    document.body.appendChild(outer);
    expect(scrollParent(sectionIn(visible), window)).toBe(outer);
  });

  describe('where nothing inside the page scrolls', () => {
    afterEach(() => { delete document.scrollingElement; });

    it('is the document\'s scrolling element', () => {
      Object.defineProperty(document, 'scrollingElement', { value: document.body, configurable: true });
      expect(scrollParent(sectionIn(document.body), window)).toBe(document.body);
    });

    // jsdom has no scrollingElement at all, as an old engine has none.
    it('is the root element where the document names none', () => {
      expect(scrollParent(sectionIn(document.body), window)).toBe(document.documentElement);
    });
  });
});

describe('landingTop', () => {
  // A box whose visible area starts 56px down the window (under a topbar),
  // already scrolled 100px, with a section 400px below its top edge.
  const place = (box, section = {}) => sectionIn(box, { top: 456, ...section });

  it('puts the section\'s top at the box\'s top, less the section\'s scroll margin', () => {
    const box = scroller({ top: 56, scrollTop: 100 });
    expect(landingTop(place(box, { margin: '16px' }), box, window)).toBe(100 + 456 - 56 - 16);
  });

  it('lands flush where the section has no margin', () => {
    const box = scroller({ top: 56, scrollTop: 100 });
    expect(landingTop(place(box), box, window)).toBe(500);
  });

  it('honours a larger margin, such as one that clears a sticky strip', () => {
    const box = scroller({ top: 56, scrollTop: 100 });
    expect(landingTop(place(box, { margin: '56px' }), box, window)).toBe(444);
  });

  it('leaves the box\'s own scroll padding clear as well', () => {
    const box = scroller({ top: 56, scrollTop: 100, padding: '40px' });
    expect(landingTop(place(box, { margin: '16px' }), box, window)).toBe(444);
  });

  it('measures from inside the box\'s border', () => {
    const box = scroller({ top: 56, scrollTop: 100, clientTop: 2 });
    expect(landingTop(place(box, { margin: '16px' }), box, window)).toBe(482);
  });

  it('works for a section above the visible area as for one below it', () => {
    const box = scroller({ top: 56, scrollTop: 1000 });
    expect(landingTop(sectionIn(box, { top: -200, margin: '16px' }), box, window)).toBe(1000 - 200 - 56 - 16);
  });

  it('does not aim past where the box can scroll, nor above its top', () => {
    const box = scroller({ top: 56, scrollTop: 100, scrollHeight: 3000, clientHeight: 800 });
    expect(landingTop(sectionIn(box, { top: 5000 }), box, window)).toBe(2200);
    expect(landingTop(sectionIn(box, { top: -5000 }), box, window)).toBe(0);
  });

  describe('for the page\'s own scroller', () => {
    const root = document.documentElement;
    afterEach(() => {
      delete root.scrollHeight;
      delete root.clientHeight;
      delete root.getBoundingClientRect;
      root.scrollTop = 0;
    });

    // The root moves up the window as the page scrolls, so its own top says
    // how far it has gone, not where the visible area starts (the window's).
    it('measures from the top of the window, whatever the root reports', () => {
      Object.defineProperties(root, {
        scrollHeight: { value: 5000, configurable: true },
        clientHeight: { value: 700, configurable: true },
      });
      root.scrollTop = 300;
      root.getBoundingClientRect = () => ({ top: -300 });
      const el = sectionIn(document.body, { top: 600, margin: '16px' });
      expect(landingTop(el, root, window)).toBe(300 + 600 - 16);
    });
  });
});
