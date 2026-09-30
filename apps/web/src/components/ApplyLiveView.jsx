import { useEffect, useRef, useState } from 'react';
import { framePainter, sameView } from '../lib/applyFrames.js';
import { useLiveInput } from '../lib/useLiveInput.js';
import ApplyOverlay from './ApplyOverlay.jsx';
import ApplyPicker from './ApplyPicker.jsx';
import ApplyTextCatcher from './ApplyTextCatcher.jsx';

// The application as it is in the browser JobDekho opened, drawn live, and
// the person's own mouse, wheel and keyboard sent back to it. Pictures go
// straight to the canvas; React only hears about a picture when the page
// scrolled or changed size, which is all the field outlines need.
export default function ApplyLiveView({ apply, view, hover }) {
  const surface = useRef(null);
  const canvas = useRef(null);
  const catcher = useRef(null);
  const [frame, setFrame] = useState(null);
  const [width, setWidth] = useState(0);
  const [typing, setTyping] = useState(false);
  const { setDraw, send } = apply;

  useEffect(() => {
    const paint = framePainter();
    setDraw((header, blob) => {
      paint(canvas.current, header, blob);
      setFrame((old) => (sameView(old, header) ? old : header));
    });
    return () => setDraw(null);
  }, [setDraw]);

  useEffect(() => {
    if (typeof ResizeObserver !== 'function' || !canvas.current) return undefined;
    const watch = new ResizeObserver(() => setWidth(canvas.current?.clientWidth ?? 0));
    watch.observe(canvas.current);
    return () => watch.disconnect();
  }, []);

  useLiveInput(surface, canvas, apply.frame, { send, focus: () => catcher.current?.focus({ preventScroll: true }) });

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div
        ref={surface}
        className={`relative select-none overflow-hidden rounded-lg border bg-paper transition-colors duration-fast ease ${
          typing ? 'border-primary/60 ring-2 ring-primary/25' : 'border-line'
        }`}
      >
        <canvas ref={canvas} role="img" aria-label={`Live view of ${view.title || 'the application'}`} className="block h-auto w-full" />
        {!frame && (
          <p className="absolute inset-0 grid place-items-center text-sm text-muted">Opening the application in a browser of its own...</p>
        )}
        <ApplyOverlay rows={view.rows} submit={view.submit} frame={frame} width={width} hover={hover} />
        {view.picker && (
          <ApplyPicker key={JSON.stringify(view.picker.rect)} picker={view.picker} frame={frame} width={width} onPick={(value) => send({ t: 'pick', value })} />
        )}
        <ApplyTextCatcher ref={catcher} onSend={send} onFocusChange={setTyping} />
      </div>
      <p className="text-xs text-muted">
        {typing ? 'Typing goes to the form. Click outside it to stop.' : 'Click in the form to type into it, as in any browser.'}
      </p>
    </div>
  );
}
