import { describe, it, expect } from 'vitest';
import { trackDitherPointer } from './ditherPointer.js';

const now = (fn) => fn();

function setup() {
  document.body.innerHTML = '<div class="dither-spot" id="card"><span id="inner">x</span></div><p id="plain">y</p>';
  const card = document.getElementById('card');
  card.getBoundingClientRect = () => ({ left: 100, top: 50 });
  return card;
}

const move = (el, x, y) => el.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: x, clientY: y }));

describe('trackDitherPointer', () => {
  it('writes the pointer into the lit element in its own coordinates', () => {
    const card = setup();
    const stop = trackDitherPointer(document, now);
    move(document.getElementById('inner'), 130, 80);
    expect(card.style.getPropertyValue('--dither-x')).toBe('30px');
    expect(card.style.getPropertyValue('--dither-y')).toBe('30px');
    stop();
  });

  it('leaves elements without a dithered hover alone', () => {
    setup();
    const stop = trackDitherPointer(document, now);
    const plain = document.getElementById('plain');
    move(plain, 10, 10);
    expect(plain.style.getPropertyValue('--dither-x')).toBe('');
    stop();
  });

  it('writes at most once per frame, with the latest position', () => {
    const card = setup();
    const queue = [];
    const stop = trackDitherPointer(document, (fn) => queue.push(fn));
    move(card, 110, 60);
    move(card, 140, 90);
    expect(queue).toHaveLength(1);
    queue[0]();
    expect(card.style.getPropertyValue('--dither-x')).toBe('40px');
    stop();
  });

  it('stops listening when stopped', () => {
    const card = setup();
    trackDitherPointer(document, now)();
    move(card, 130, 80);
    expect(card.style.getPropertyValue('--dither-x')).toBe('');
  });
});
