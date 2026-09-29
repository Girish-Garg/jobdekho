import { useRef, useState } from 'react';
import { CHAT_WIDTH } from '../lib/chatLayout.js';

const KEYS = { ArrowLeft: -CHAT_WIDTH.step, ArrowRight: CHAT_WIDTH.step };

// The panel's right edge, dragged to make it wider or narrower. It is a real
// separator, so the arrow keys move it too (Home and End to either limit)
// and a screen reader hears the width as a value between two bounds.
//
// Pointer capture keeps the drag going when the pointer runs ahead of the
// edge, which it always does on a fast drag, and preventDefault on the press
// stops the drag selecting the text either side of it. The saffron line is
// the affordance: faint on hover, solid while dragging or focused. On a
// `rounded` panel it stops short of the corners, where the edge curves away.
export default function ChatResizeHandle({ width, min, max, rounded = false, onResize }) {
  const start = useRef(null);
  const [dragging, setDragging] = useState(false);

  function onPointerDown(event) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    start.current = { x: event.clientX, width };
    setDragging(true);
  }

  function onPointerMove(event) {
    if (!start.current) return;
    onResize(start.current.width + event.clientX - start.current.x);
  }

  function onPointerUp() {
    start.current = null;
    setDragging(false);
  }

  function onKeyDown(event) {
    const to = event.key in KEYS ? width + KEYS[event.key] : event.key === 'Home' ? min : event.key === 'End' ? max : null;
    if (to === null) return;
    event.preventDefault();
    onResize(to);
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize the chat"
      aria-valuenow={width}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      className="group absolute inset-y-0 -right-1.5 z-10 w-3 cursor-col-resize touch-none"
    >
      <span
        aria-hidden="true"
        className={`absolute left-1/2 w-0.5 -translate-x-1/2 rounded-full transition-colors duration-fast ease ${rounded ? 'inset-y-4' : 'inset-y-0'} ${
          dragging ? 'bg-primary' : 'bg-transparent group-hover:bg-primary/50 group-focus-visible:bg-primary'
        }`}
      />
    </div>
  );
}
