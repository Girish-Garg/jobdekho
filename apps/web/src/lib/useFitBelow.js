import { useLayoutEffect, useRef, useState } from 'react';

// Room left under the panel's top edge, for a gap above the window's bottom.
const GAP = 16;
// Never so short that a panel is only a sliver of scrollbar.
const MIN = 160;

// The height a panel opened under a trigger can take without running off the
// bottom of the window, measured from where it actually opened: a filter bar
// that wraps onto two lines on a phone opens its panels lower than on a PC,
// so a fixed allowance either cut them off there or made them scroll on a PC
// where they fit. Measured again as the window is resized.
export function useFitBelow(open) {
  const ref = useRef(null);
  const [max, setMax] = useState(null);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const fit = () => {
      const top = ref.current?.getBoundingClientRect().top ?? 0;
      setMax(Math.max(MIN, Math.floor(globalThis.innerHeight - top - GAP)));
    };
    fit();
    globalThis.addEventListener?.('resize', fit);
    return () => globalThis.removeEventListener?.('resize', fit);
  }, [open]);

  return [ref, max];
}
