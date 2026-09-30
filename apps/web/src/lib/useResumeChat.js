import { useEffect, useRef } from 'react';

// The Resume page is built around the chat: every change to a document is
// asked for there, so arriving opens it, docked beside the documents (see
// useChatLayout.js), when it was closed. Leaving puts it back the way it was:
// a chat the page opened for itself closes again, rather than staying open
// over pages where nobody asked for it. Opening or closing it by hand while
// on the page makes it the person's own, and leaving then changes nothing.
// `wide` says whether there is room: on a narrow window the chat would cover
// the documents entirely, so it is not opened there.
//
// Returns the toggle the topbar should use, which is what hands the chat to
// the person.
export function useResumeChat(view, chat, wide) {
  const openedByPage = useRef(false);

  useEffect(() => {
    if (view === 'resume') {
      if (!chat.open && wide()) {
        chat.show();
        openedByPage.current = true;
      }
      return;
    }
    if (openedByPage.current) {
      openedByPage.current = false;
      chat.close();
    }
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  return () => {
    openedByPage.current = false;
    chat.toggle();
  };
}
