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
    for (let row = 0, y = pitch / 2; y < size.height; row += 1, y += pitch) {
      for (let col = 0, x = pitch / 2; x < size.width; col += 1, x += pitch) {
        const density = strength * (1 - Math.hypot(x - x0, y - y0) / radius);
        if (dotAt(col, row, density)) ctx.fillRect(x - dot / 2, y - dot / 2, dot, dot);
      }
    }
  }
}

// Only a paint worklet's scope has registerPaint; tests import the class.
if (typeof registerPaint === 'function') registerPaint('dither', DitherPainter);
