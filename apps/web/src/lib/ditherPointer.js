// The dithered hovers (dither.css) grow from the pointer, so the element under
// it needs the pointer's position inside its own box. One listener for the
// whole app writes it as two custom properties on that element, at most once
// a frame, rather than every button and card wiring handlers of its own.
// The last position stays when the pointer leaves, so the dots dissolve back
// into the spot they were left at.
export const DITHER_SELECTOR = '.btn, .dither, .dither-spot';

export function trackDitherPointer(root = document, schedule = (fn) => requestAnimationFrame(fn)) {
  let pending = null;
  let queued = false;

  const write = () => {
    queued = false;
    const { el, x, y } = pending;
    const box = el.getBoundingClientRect();
    el.style.setProperty('--dither-x', `${Math.round(x - box.left)}px`);
    el.style.setProperty('--dither-y', `${Math.round(y - box.top)}px`);
  };

  const onPointer = (event) => {
    const el = typeof event.target?.closest === 'function' ? event.target.closest(DITHER_SELECTOR) : null;
    if (!el) return;
    pending = { el, x: event.clientX, y: event.clientY };
    if (!queued) {
      queued = true;
      schedule(write);
    }
  };

  root.addEventListener('pointerover', onPointer, { passive: true });
  root.addEventListener('pointermove', onPointer, { passive: true });
  return () => {
    root.removeEventListener('pointerover', onPointer);
    root.removeEventListener('pointermove', onPointer);
  };
}
