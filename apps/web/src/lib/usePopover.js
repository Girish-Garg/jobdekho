import { useEffect, useRef, useState } from 'react';

// Open state plus the two ways a popover closes without a second click on its
// trigger: Escape, and a pointer press anywhere outside it. setOpen is stable,
// so the listeners re-bind on open rather than on every render.
export function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => !ref.current?.contains(event.target) && setOpen(false);
    const onKey = (event) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return { open, setOpen, ref };
}
