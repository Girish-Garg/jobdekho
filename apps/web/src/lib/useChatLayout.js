import { useEffect, useState } from 'react';
import { useMediaQuery } from './useMediaQuery.js';
import { CHAT_WIDTH, WIDE_QUERY, clampWidth, maxWidth, readLayout, saveLayout } from './chatLayout.js';

function useViewportWidth(view = globalThis) {
  const [width, setWidth] = useState(() => view?.innerWidth ?? 1440);
  useEffect(() => {
    if (!view?.addEventListener) return undefined;
    const onResize = () => setWidth(view.innerWidth);
    view.addEventListener('resize', onResize);
    return () => view.removeEventListener('resize', onResize);
  }, [view]);
  return width;
}

// The panel's placement for this render. The saved width is kept as it was
// asked for and only clamped for display, so a window made narrow for a
// minute gives the panel back its width when it grows again. Pinning and
// resizing only mean anything on a wide window; below it the panel covers
// the feed whatever was saved.
export function useChatLayout() {
  const wide = useMediaQuery(WIDE_QUERY);
  const viewport = useViewportWidth();
  const [saved, setSaved] = useState(readLayout);

  function update(patch) {
    setSaved((now) => ({ ...now, ...patch }));
    saveLayout(patch);
  }

  return {
    wide,
    pinned: wide && saved.pinned,
    width: clampWidth(saved.width, viewport),
    min: CHAT_WIDTH.min,
    max: maxWidth(viewport),
    setWidth: (width) => update({ width: clampWidth(width, viewport) }),
    togglePinned: () => update({ pinned: !saved.pinned }),
  };
}
