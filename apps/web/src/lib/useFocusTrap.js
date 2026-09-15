import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Shared by the command palette and the shortcuts help: both are modal
// overlays where Tab must not leak into the page behind them, and both need
// to hand focus back to whatever opened them rather than dropping it on
// <body>. Kept as one hook so the two dialogs cannot drift on this behaviour.
export function useFocusTrap(open) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement;
    const node = ref.current;
    const focusables = () => Array.from(node?.querySelectorAll(FOCUSABLE) || []);

    focusables()[0]?.focus();

    function onKeyDown(event) {
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      opener?.focus?.();
    };
  }, [open]);

  return ref;
}
