// The chat the person last chose, kept in the browser so a reload opens the
// panel on it rather than on whichever chat happens to be newest. Storage
// can throw outright in a locked-down browser, and a chat on screen is never
// worth failing a render: without it, the newest general chat opens instead.
const KEY = 'jobdekho-chat-on-screen';

// The app only ever saves a chat's id here, but anything on this computer
// can change it: a name every plain object answers to ("constructor") would
// find a function among the chats and blank the page on every load.
export function readSavedChat() {
  try {
    const id = globalThis.localStorage?.getItem(KEY) || null;
    return id && !(id in Object.prototype) ? id : null;
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
