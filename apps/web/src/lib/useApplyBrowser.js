import { useEffect, useState } from 'react';
import { getApplyBrowser } from '../api/apply.js';

// Whether this computer has a browser Apply assist can drive, asked once per
// page load and shared by every posting's button: the answer only changes
// when the person installs one, which needs a restart of JobDekho anyway.
let asked = null;

export function useApplyBrowser() {
  const [found, setFound] = useState(undefined);
  useEffect(() => {
    let live = true;
    asked ??= getApplyBrowser().catch(() => ({ browser: null }));
    asked.then((answer) => live && setFound(answer.browser ?? null));
    return () => {
      live = false;
    };
  }, []);
  return found;
}

// For tests: forget the cached answer.
export function resetApplyBrowser() {
  asked = null;
}
