// A CSS paint worklet that draws ordered (Bayer) dithering as an element's
// background, so the dots sit under its text. Density falls off from a point
// (--dither-x, --dither-y) over a radius (--dither-r), and a dot is drawn only
// where the density beats its cell's Bayer threshold: that is what makes the
// edge break up into a pattern instead of blurring. The radius and strength
// are registered custom properties (see dither.css), so CSS transitions
// animate them and the browser repaints every frame; nothing here holds state.
// It is loaded with CSS.paintWorklet.addModule, so it cannot import anything.

// The 4 by 4 Bayer matrix: each cell's rank in the order dots appear.
export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

const INPUTS = [
  '--dither-x', '--dither-y', '--dither-r', '--dither-strength',
  '--dither-color', '--dither-pitch', '--dither-dot',
];

function number(props, name, fallback) {
  const value = parseFloat(String(props.get(name) ?? ''));
  return Number.isFinite(value) ? value : fallback;
}

// The first and last cell index along one axis that the circle around
// `centre` of `radius` can reach, clamped to the element's `length`.
export function span(centre, radius, pitch, length) {
  const last = Math.max(0, Math.floor((length - pitch / 2) / pitch));
  return [Math.max(0, Math.floor((centre - radius) / pitch)), Math.min(last, Math.ceil((centre + radius) / pitch))];
}

// Whether the cell at column `col`, row `row` shows a dot at `density` (0 to 1).
export function dotAt(col, row, density) {
  return density > (BAYER[(row % 4) * 4 + (col % 4)] + 0.5) / 16;
}

export class DitherPainter {
  static get inputProperties() {
    return INPUTS;
  }

  paint(ctx, size, props) {
    const radius = number(props, '--dither-r', 0);
    const strength = number(props, '--dither-strength', 0);
    if (radius <= 0 || strength <= 0) return;
    const pitch = Math.max(2, number(props, '--dither-pitch', 4));
    const dot = Math.min(pitch, number(props, '--dither-dot', 1.5));
    const x0 = number(props, '--dither-x', size.width / 2);
    const y0 = number(props, '--dither-y', size.height / 2);
    ctx.fillStyle = String(props.get('--dither-color') ?? '').trim() || 'rgba(128, 128, 128, 0.2)';
    // Only the cells inside the lit circle's box can hold a dot: on a long
    // row that is a fraction of the width, and this runs every frame the
    // pointer moves, so a slow computer feels the difference.
    const [c0, c1] = span(x0, radius, pitch, size.width);
    const [r0, r1] = span(y0, radius, pitch, size.height);
    for (let row = r0; row <= r1; row += 1) {
      const y = (row + 0.5) * pitch;
      for (let col = c0; col <= c1; col += 1) {
        const x = (col + 0.5) * pitch;
        const density = strength * (1 - Math.hypot(x - x0, y - y0) / radius);
        if (dotAt(col, row, density)) ctx.fillRect(x - dot / 2, y - dot / 2, dot, dot);
      }
    }
  }
}

// Only a paint worklet's scope has registerPaint; tests import the class.
if (typeof registerPaint === 'function') registerPaint('dither', DitherPainter);
