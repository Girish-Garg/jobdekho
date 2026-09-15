import { describe, it, expect } from 'vitest';
import { fitSegments, clamp01 } from './fitSegments.js';

const BREAKDOWN = [
  { dimension: 'skills', value: 0.62, max: 45 },
  { dimension: 'titles', value: 1, max: 25 },
  { dimension: 'level', value: 0, max: 20 },
  { dimension: 'degree', value: 0.5, max: 10 },
];

describe('fitSegments', () => {
  it('gives each dimension its share of the whole score as width', () => {
    expect(fitSegments(BREAKDOWN, 70).map((s) => s.widthPct)).toEqual([45, 25, 20, 10]);
  });

  it('fills each segment by what that dimension earned', () => {
    expect(fitSegments(BREAKDOWN, 70).map((s) => Math.round(s.fillPct))).toEqual([62, 100, 0, 50]);
  });

  // A ranked row always carries fit; the breakdown rides only some rows.
  it('falls back to one segment drawn against the score itself', () => {
    expect(fitSegments(null, 79)).toEqual([{ key: 'fit', widthPct: 100, fillPct: 79 }]);
    expect(fitSegments([], 0)).toEqual([{ key: 'fit', widthPct: 100, fillPct: 0 }]);
  });

  it('keeps a value the server never promised inside the bar', () => {
    expect(clamp01(1.4)).toBe(1);
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(undefined)).toBe(0);
    expect(fitSegments([{ dimension: 'skills', value: 3, max: 10 }], 50)[0].fillPct).toBe(100);
  });
});
