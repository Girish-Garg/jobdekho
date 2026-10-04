import { describe, it, expect } from 'vitest';
import { tipPlace } from './tipPlace.js';

const box = { top: 100, left: 0, bottom: 700, right: 460 };
const tip = { width: 200, height: 40 };
const host = (top, left, width = 80) => ({ top, bottom: top + 20, left, right: left + width });

describe('tipPlace', () => {
  it('opens under the value from its start edge where there is room', () => {
    expect(tipPlace(host(300, 20), tip, box)).toEqual({ up: false, end: false });
  });

  // Low in the pane's scroll, a tip opened under the footer and was cut off.
  it('opens above a value too low for it, when there is more room above', () => {
    expect(tipPlace(host(650, 20), tip, box)).toEqual({ up: true, end: false });
  });

  it('stays under a value when above has even less room', () => {
    expect(tipPlace(host(110, 20), tip, { ...box, bottom: 150 })).toEqual({ up: false, end: false });
  });

  // In the pane's right-hand column a tip ran past the pane's edge.
  it('lines up with the end edge when the start edge leaves it no room', () => {
    expect(tipPlace(host(300, 330), tip, box)).toEqual({ up: false, end: true });
  });

  it('keeps an end-aligned tip at the end, unless only the start edge has room', () => {
    expect(tipPlace(host(300, 330), tip, box, 'end')).toEqual({ up: false, end: true });
    expect(tipPlace(host(300, 10, 40), tip, box, 'end')).toEqual({ up: false, end: false });
  });
});
