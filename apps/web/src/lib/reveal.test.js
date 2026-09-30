import { describe, it, expect, afterEach } from 'vitest';
import { installReveal } from './reveal.js';

// A stand-in IntersectionObserver the test can make report an arrival.
function fakeWindow() {
  const observers = [];
  class IO {
    constructor(callback) { this.callback = callback; this.targets = new Set(); observers.push(this); }
    observe(el) { this.targets.add(el); }
    unobserve(el) { this.targets.delete(el); }
    disconnect() { this.targets.clear(); }
  }
  const win = { document, IntersectionObserver: IO, MutationObserver: window.MutationObserver };
  const arrive = (els) => observers[0].callback(els.map((target) => ({ target, isIntersecting: true })));
  return { win, observers, arrive };
}

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-reveal-ready');
  delete document.documentElement.dataset.effects;
});

describe('installReveal', () => {
  it('marks what arrives, a beat apart, and stops watching it', () => {
    document.body.innerHTML = '<section data-reveal id="a"></section><section data-reveal id="b"></section>';
    const { win, observers, arrive } = fakeWindow();
    const stop = installReveal(win);
    expect(document.documentElement.hasAttribute('data-reveal-ready')).toBe(true);
    const [a, b] = [document.getElementById('a'), document.getElementById('b')];
    arrive([a, b]);
    expect(a.hasAttribute('data-revealed') && b.hasAttribute('data-revealed')).toBe(true);
    expect(b.style.getPropertyValue('--reveal-i')).toBe('1');
    expect(observers[0].targets.size).toBe(0);
    stop();
    expect(document.documentElement.hasAttribute('data-reveal-ready')).toBe(false);
  });

  it('hides nothing when effects are off', () => {
    document.documentElement.dataset.effects = 'off';
    expect(installReveal(fakeWindow().win)).toBeNull();
    expect(document.documentElement.hasAttribute('data-reveal-ready')).toBe(false);
  });

  it('installs once', () => {
    const { win } = fakeWindow();
    const stop = installReveal(win);
    expect(installReveal(win)).toBeNull();
    stop();
  });
});
