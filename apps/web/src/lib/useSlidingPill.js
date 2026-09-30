import { useLayoutEffect, useRef, useState } from 'react';

// One highlight that glides to whichever item is active, instead of each item
// painting a background of its own: the motion says where the choice moved.
// The container takes `ref`; its items mark themselves with data-pill-key;
// the highlight takes `style`. It is measured after layout, and again when
// the container resizes (a font loading, a label changing weight). The first
// placement does not glide, since there is nowhere it came from.
export function useSlidingPill(activeKey) {
  const ref = useRef(null);
  const [box, setBox] = useState(null);
  const [glides, setGlides] = useState(false);

  useLayoutEffect(() => {
    const container = ref.current;
    if (!container) return undefined;
    const measure = () => {
      const item = container.querySelector(`[data-pill-key="${activeKey}"]`);
      setBox(item ? { left: item.offsetLeft, top: item.offsetTop, width: item.offsetWidth, height: item.offsetHeight } : null);
    };
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(container);
    return () => observer?.disconnect();
  }, [activeKey]);

  useLayoutEffect(() => {
    if (box && !glides) {
      const frame = requestAnimationFrame(() => setGlides(true));
      return () => cancelAnimationFrame(frame);
    }
    return undefined;
  }, [box, glides]);

  const style = box
    ? { transform: `translate(${box.left}px, ${box.top}px)`, width: box.width, height: box.height }
    : { opacity: 0 };
  return { ref, style, glides };
}
