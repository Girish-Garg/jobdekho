import { useEffect, useRef, useState } from 'react';
import { framePainter, sameView } from '../lib/applyFrames.js';
import { useLiveInput } from '../lib/useLiveInput.js';
import ApplyOverlay from './ApplyOverlay.jsx';
import ApplyPicker from './ApplyPicker.jsx';
import ApplyTextCatcher from './ApplyTextCatcher.jsx';

// The application as it is in the browser JobDekho opened, drawn live, and
// the person's own mouse, wheel and keyboard sent back to it. Pictures go
// straight to the canvas; React only hears about a picture when the page
// scrolled or changed size, which is all the field outlines need. It sits
// inside the browser frame (ApplyBrowserFrame.jsx), which draws the border
// and says, from `onTyping`, where typing goes.
export default function ApplyLiveView({ apply, view, hover, onTyping = () => {} }) {
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

  useEffect(() => onTyping(typing), [typing]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-0 flex-col">
      <div
        ref={surface}
        className={`relative select-none overflow-hidden bg-paper transition-shadow duration-fast ease ${typing ? 'ring-2 ring-inset ring-primary/40' : ''}`}
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
    </div>
  );
}
