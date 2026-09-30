import { useEffect, useRef } from 'react';
import { toPage } from './applyPoint.js';

// The person's mouse and wheel on the live view, sent as the page's own
// pixels. Mouse events rather than pointer events, since only they carry the
// click count a double-click (select a word) needs. The wheel is taken with a
// native listener that is not passive, because React's own wheel handler
// cannot stop the panel scrolling under the picture while the page should.
// Hover moves go at most ten a second; moves with the button held (a drag, a
// slider) go as they come. A right click opens no menu: a menu in the hidden
// window would be invisible and would swallow the next click.
export function useLiveInput(surface, canvas, frame, { send, focus }) {
  const latest = useRef({ send, focus });
  latest.current = { send, focus };

  useEffect(() => {
    const el = surface.current;
    if (!el) return undefined;
    let wheel = { dx: 0, dy: 0, at: null, due: false };
    let lastMove = 0;
    const point = (event) => toPage(canvas.current.getBoundingClientRect(), event.clientX, event.clientY, frame.current);
    const clicks = (event) => Math.min(3, Math.max(1, event.detail || 1));
    const handlers = {
      mousedown: (event) => {
        if (event.button !== 0) return;
        // Without this the press's own default moves focus off the keyboard
        // catcher again, straight after it was given.
        event.preventDefault();
        latest.current.focus();
        latest.current.send({ t: 'down', ...point(event), button: 'left', clicks: clicks(event) });
      },
      mouseup: (event) => {
        if (event.button === 0) latest.current.send({ t: 'up', ...point(event), button: 'left', clicks: clicks(event) });
      },
      mousemove: (event) => {
        const held = (event.buttons & 1) === 1;
        const now = Date.now();
        if (!held && now - lastMove < 100) return;
        lastMove = now;
        latest.current.send({ t: 'move', ...point(event), button: held ? 'left' : 'none', clicks: 1 });
      },
      wheel: (event) => {
        event.preventDefault();
        wheel = { dx: wheel.dx + event.deltaX, dy: wheel.dy + event.deltaY, at: point(event), due: wheel.due };
        if (wheel.due) return;
        wheel.due = true;
        requestAnimationFrame(() => {
          latest.current.send({ t: 'wheel', ...wheel.at, dx: Math.round(wheel.dx), dy: Math.round(wheel.dy) });
          wheel = { dx: 0, dy: 0, at: null, due: false };
        });
      },
      contextmenu: (event) => event.preventDefault(),
    };
    for (const [name, fn] of Object.entries(handlers)) el.addEventListener(name, fn, name === 'wheel' ? { passive: false } : undefined);
    return () => {
      for (const [name, fn] of Object.entries(handlers)) el.removeEventListener(name, fn);
    };
  }, [surface, canvas, frame]);
}
