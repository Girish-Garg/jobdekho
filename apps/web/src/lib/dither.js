import workletUrl from './ditherWorklet.js?url';
import { trackDitherPointer } from './ditherPointer.js';

// Dithered hovers need the CSS Paint API, which Chrome and Edge have. Without
// it a paint() background is an invalid value and is simply dropped, so every
// control keeps its plain hover and nothing else has to know the browser.
export function installDither(win = window) {
  const worklet = win.CSS?.paintWorklet;
  if (!worklet) return false;
  worklet.addModule(workletUrl);
  trackDitherPointer(win.document);
  return true;
}
