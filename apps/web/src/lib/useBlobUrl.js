import { useCallback, useEffect, useRef, useState } from 'react';

// A PDF held for an iframe to show: the blob and an address for it, with the
// last address given back to the browser whenever another takes its place
// and when the screen showing it goes. `show(null)` clears it.
export function useBlobUrl() {
  const [held, setHeld] = useState({ url: null, blob: null });
  const urlRef = useRef(null);

  const show = useCallback((blob) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = blob ? URL.createObjectURL(blob) : null;
    setHeld({ url: urlRef.current, blob });
  }, []);

  useEffect(() => () => urlRef.current && URL.revokeObjectURL(urlRef.current), []);

  return { url: held.url, blob: held.blob, show };
}
