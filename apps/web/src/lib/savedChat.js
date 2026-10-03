// The chat the person last chose, kept in the browser so a reload opens the
// panel on it rather than on whichever chat happens to be newest. Storage
// can throw outright in a locked-down browser, and a chat on screen is never
// worth failing a render: without it, the newest general chat opens instead.
const KEY = 'jobdekho-chat-on-screen';

export function readSavedChat() {
  try {
    return globalThis.localStorage?.getItem(KEY) || null;
  } catch {
    return null;
  }
}

export function saveChat(id) {
  try {
    if (id) globalThis.localStorage?.setItem(KEY, id);
    else globalThis.localStorage?.removeItem(KEY);
  } catch {
    // The chat on screen is still this page's, only not the next one's.
  }
}
