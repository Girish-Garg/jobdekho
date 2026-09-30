import { useEffect, useRef } from 'react';

// Presses that land outside the pane yet must not close it: a row opens its
// own job in the pane instead, the chat (and its toggle) is where a person
// asks about the job that is open, and a dialog or a notice sits above
// everything. Anything else marks itself with data-keeps-pane.
const KEEP = '[data-row-id], [data-keeps-pane], [role="dialog"], [role="alert"], [role="status"]';

// A press on a scroll container's own scrollbar reports the container as its
// target; dragging the feed's scrollbar is reading on, not leaving the job.
function onScrollbar(event) {
  const el = event.target;
  return el.clientWidth > 0 && event.offsetX > el.clientWidth;
}

// Calls onDismiss for a press anywhere else while `active`. The latest
// onDismiss is read through a ref, so a parent handing a new function every
// render does not re-bind the listener each time.
export function useOutsideDismiss(ref, onDismiss, active) {
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    if (!active) return undefined;
    const onDown = (event) => {
      const target = event.target;
      if (!(target instanceof Element) || ref.current?.contains(target)) return;
      if (target.closest(KEEP) || onScrollbar(event)) return;
      dismissRef.current();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [active, ref]);
}
