import { useLayoutEffect } from 'react';
import { chatIdOf, followsOn, pick, setPage, setPinned, useOnScreen } from './activeChat.js';
import { sameChat, useChatStore } from './chatStore.js';

// The page on screen, told to the chat as soon as it changes. A layout
// effect, because the feed leaving announces "no job open" as it goes, and
// that must read as leaving the feed rather than as closing the pane (see
// activeChat.js). Shell tells it too, so the chat keeps up with the pages
// while the panel is closed.
export function useChatPage(page) {
  useLayoutEffect(() => setPage(page), [page]);
}

// The chat on screen in the panel (see activeChat.js), the pin, the job or
// document open on this page (`here`, the switcher's first group), and the
// same when its own chat is not the one on screen (`other`), for the
// header's "Open Microsoft's chat".
export function useActiveChat(page) {
  useChatPage(page);
  const screen = useOnScreen();
  const store = useChatStore();
  const id = chatIdOf(screen);
  const type = followsOn(page);
  const item = type ? screen.seen[type] : null;
  const here = item ? { type, item, chatId: `${type}:${item.id}` } : null;
  return {
    id,
    pinned: screen.pinned,
    here,
    other: here && !sameChat(here.chatId, id, store) ? here : null,
    pick,
    togglePin: () => setPinned(!screen.pinned),
  };
}
