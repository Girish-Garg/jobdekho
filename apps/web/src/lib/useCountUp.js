import { useEffect, useState } from 'react';

const REDUCE = '(prefers-reduced-motion: reduce)';

// Whether to skip the count. Where matchMedia is missing (jsdom, an old
// engine) there is no way to ask, so the number simply shows at once.
function stillWanted(view) {
  const media = view?.matchMedia?.(REDUCE);
  return !media || media.matches;
}

// A number that counts up to its value when it first shows: about half a
// second, slowing as it lands, so a score arrives rather than sits there. It
// runs again only when the value changes (another job opened in the pane).
export function useCountUp(value, { duration = 600, view = typeof window === 'undefined' ? null : window } = {}) {
  const still = !Number.isFinite(value) || stillWanted(view);
  const [shown, setShown] = useState(still ? value : 0);

  useEffect(() => {
    if (still) {
      setShown(value);
      return undefined;
    }
    let frame = 0;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      setShown(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, still]);

  return shown;
}
