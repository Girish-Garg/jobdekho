// How much motion and texture the app draws, on this computer: 'full',
// 'light' or 'off'. Light keeps the small touches (buttons, the page easing
// in) and drops what repaints as the pointer moves (the lit cards) and the
// dithered ground, which is what a slow computer feels. Off moves nothing.
// A person can pick in Settings; left on 'auto', a low-end computer gets
// light and anyone who asked their system for less motion gets off. Kept per
// device, like the theme, since one computer can be fast and another slow.
const KEY = 'jobdekho-effects';
export const EFFECT_CHOICES = ['auto', 'full', 'light', 'off'];

export function readEffectsChoice(storage = globalThis.localStorage) {
  try {
    const value = storage?.getItem(KEY);
    return EFFECT_CHOICES.includes(value) ? value : 'auto';
  } catch {
    return 'auto';
  }
}

export function writeEffectsChoice(value, storage = globalThis.localStorage) {
  try {
    storage?.setItem(KEY, value);
  } catch {
    // Private windows can refuse storage; the choice then lasts the session.
  }
}

// Four cores or fewer, 4 GB or less, or a data-saving connection: the
// machines where a repaint per pointer move shows as lag.
export function isLowEnd(nav = globalThis.navigator) {
  if (!nav) return false;
  return (nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= 4)
    || (nav.deviceMemory > 0 && nav.deviceMemory <= 4)
    || Boolean(nav.connection?.saveData);
}

export function resolveEffects(choice, { reduce = false, low = false } = {}) {
  if (choice !== 'auto') return choice;
  if (reduce) return 'off';
  return low ? 'light' : 'full';
}

// Read once at start and again whenever Settings changes it; the level sits
// on <html> as data-effects, which motion.css and the pointer tracker read.
export function applyEffects(choice = readEffectsChoice(), win = globalThis.window) {
  const reduce = Boolean(win?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  const level = resolveEffects(choice, { reduce, low: isLowEnd(win?.navigator) });
  if (win?.document) win.document.documentElement.dataset.effects = level;
  return level;
}

export const effectsLevel = (doc = globalThis.document) => doc?.documentElement?.dataset.effects || 'full';
