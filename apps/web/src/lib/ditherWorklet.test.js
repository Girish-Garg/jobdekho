import { describe, it, expect } from 'vitest';
import { BAYER, DitherPainter, dotAt, span } from './ditherWorklet.js';

// Custom properties as the worklet receives them: typed values printed as
// strings, and unset ones as nothing.
const propsOf = (values) => ({ get: (name) => (name in values ? String(values[name]) : '') });

const paintWith = (values, size = { width: 40, height: 40 }) => {
  const dots = [];
  const ctx = { fillStyle: '', fillRect: (x, y) => dots.push([x, y]) };
  new DitherPainter().paint(ctx, size, propsOf(values));
  return { dots, color: ctx.fillStyle };
};

describe('the dither worklet', () => {
  it('uses every rank of the 4 by 4 Bayer matrix once', () => {
    expect([...BAYER].sort((a, b) => a - b)).toEqual([...Array(16).keys()]);
  });

  it('lights cells in Bayer order as density rises', () => {
    expect(dotAt(0, 0, 0.1)).toBe(true);
    expect(dotAt(1, 0, 0.1)).toBe(false);
    expect(dotAt(1, 0, 0.6)).toBe(true);
    expect(dotAt(0, 3, 0.9)).toBe(false);
  });

  it('draws nothing at rest, so an idle control costs no dots', () => {
    expect(paintWith({ '--dither-r': '0px', '--dither-strength': 1 }).dots).toHaveLength(0);
    expect(paintWith({ '--dither-r': '100px', '--dither-strength': 0 }).dots).toHaveLength(0);
  });

  it('is densest at the pointer and thins out away from it', () => {
    const { dots, color } = paintWith({
      '--dither-r': '40px', '--dither-strength': 1, '--dither-x': '0px', '--dither-y': '0px',
      '--dither-pitch': 4, '--dither-color': 'rgb(1 2 3 / 0.5)',
    });
    const near = dots.filter(([x, y]) => x < 12 && y < 12).length;
    const far = dots.filter(([x, y]) => x > 24 && y > 24).length;
    expect(near).toBeGreaterThan(far);
    expect(color).toBe('rgb(1 2 3 / 0.5)');
  });

  it('starts from the middle when no pointer position has been written', () => {
    const { dots } = paintWith({ '--dither-r': '8px', '--dither-strength': 1, '--dither-pitch': 4 });
    expect(dots.length).toBeGreaterThan(0);
    for (const [x, y] of dots) expect(Math.hypot(x - 19.25, y - 19.25)).toBeLessThan(10);
  });

  // It runs every frame the pointer moves, so it only visits the cells the
  // lit circle can reach, never the whole of a long row.
  it('visits only the cells within reach of the lit circle', () => {
    expect(span(10, 8, 4, 1000)).toEqual([0, 5]);
    expect(span(500, 40, 4, 1000)).toEqual([115, 135]);
    expect(span(990, 40, 4, 1000)).toEqual([237, 249]);
    const { dots } = paintWith({ '--dither-r': '20px', '--dither-strength': 1, '--dither-x': '500px', '--dither-y': '10px', '--dither-pitch': 4 }, { width: 1000, height: 20 });
    expect(dots.length).toBeGreaterThan(0);
    for (const [x] of dots) expect(Math.abs(x + 0.75 - 500)).toBeLessThan(24);
  });
});
