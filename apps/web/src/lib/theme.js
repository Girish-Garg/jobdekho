// Which theme the app is in, and how that survives a reload. The choice is
// the person's ("follow the system", "light", "dark"); the theme is what that
// resolves to right now. index.html applies the same rule inline before first
// paint, so this module and that script have to agree on the key and the rule.
export const KEY = 'jobdekho-theme';
export const CHOICES = ['system', 'light', 'dark'];
const QUERY = '(prefers-color-scheme: dark)';

// Storage can throw outright in a locked-down browser, not just come back
// empty, and a theme is never worth failing a render over.
export function readChoice(storage = globalThis.localStorage) {
  try {
    const stored = storage?.getItem(KEY);
    return CHOICES.includes(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function writeChoice(choice, storage = globalThis.localStorage) {
  try {
    storage?.setItem(KEY, choice);
  } catch {
    // A theme that does not persist is still a theme for this session.
  }
}

export const resolve = (choice, prefersDark) =>
  (choice === 'system' ? (prefersDark ? 'dark' : 'light') : choice);

export function prefersDark(view = globalThis) {
  return Boolean(view?.matchMedia?.(QUERY)?.matches);
}

// Light is the absence of the attribute rather than data-theme="light", so a
// page that never runs this still renders in the default theme.
export function applyTheme(choice, { root = globalThis.document?.documentElement, view = globalThis } = {}) {
  const theme = resolve(choice, prefersDark(view));
  if (!root) return theme;
  if (theme === 'dark') root.setAttribute('data-theme', 'dark');
  else root.removeAttribute('data-theme');
  return theme;
}

// Only "follow the system" listens: once someone has chosen, the system
// switching at sunset must not move them back.
export function watchSystem(onChange, view = globalThis) {
  const media = view?.matchMedia?.(QUERY);
  if (!media?.addEventListener) return () => {};
  const handler = () => onChange();
  media.addEventListener('change', handler);
  return () => media.removeEventListener('change', handler);
}
