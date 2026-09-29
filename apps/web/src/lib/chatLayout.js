// Where the chat panel sits and how wide it is, and how that survives a
// reload. Floating over the feed is the default, so opening the chat never
// reflows the list under the reader's eye; pinned, it takes a column of its
// own and the feed makes room. Either way it can be dragged wider.
export const CHAT_WIDTH = { min: 320, max: 720, fallback: 380, step: 16 };

// The job pane turns into a dialog below this (see PostingsView.jsx), and the
// chat has no room to sit beside anything either, so it covers the feed.
export const WIDE_QUERY = '(min-width: 1100px)';

const KEY = 'jobdekho-chat-layout';
const DEFAULTS = { pinned: false, width: CHAT_WIDTH.fallback, open: false };

// Never more than 60 percent of the window, so a widened panel can not
// swallow the feed it is meant to be read beside.
export function maxWidth(viewport) {
  const room = Math.floor((Number(viewport) || 0) * 0.6);
  return Math.max(CHAT_WIDTH.min, Math.min(CHAT_WIDTH.max, room));
}

export function clampWidth(width, viewport) {
  const wanted = Math.round(Number(width));
  const value = Number.isFinite(wanted) && wanted > 0 ? wanted : CHAT_WIDTH.fallback;
  return Math.min(maxWidth(viewport), Math.max(CHAT_WIDTH.min, value));
}

// Storage can throw outright in a locked-down browser (reading the property
// itself, not only the call), and a layout is never worth failing a render.
function storage() {
  return globalThis.localStorage;
}

export function readLayout() {
  try {
    const saved = JSON.parse(storage()?.getItem(KEY) ?? 'null');
    if (!saved || typeof saved !== 'object') return { ...DEFAULTS };
    const width = Number(saved.width);
    return {
      pinned: saved.pinned === true,
      width: Number.isFinite(width) && width > 0 ? width : DEFAULTS.width,
      open: saved.open === true,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveLayout(patch) {
  try {
    storage()?.setItem(KEY, JSON.stringify({ ...readLayout(), ...patch }));
  } catch {
    // A layout that does not persist is still this session's layout.
  }
}

// A pinned panel is part of the page's layout, like a docked sidebar, so it
// comes back open after a reload; a floating one is a thing opened for a
// question and starts closed. On a narrow window it would only cover the
// feed, so it waits to be asked for there.
export function opensDocked(view = globalThis) {
  const saved = readLayout();
  return saved.pinned && saved.open && Boolean(view?.matchMedia?.(WIDE_QUERY)?.matches);
}
