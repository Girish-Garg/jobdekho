import { openChat } from './activeChat.js';
import { requestOpenDocument } from './openDocumentSignal.js';

// Where the links inside a chat go: a filter or sort an answer offered and
// a job it named act on the feed (see useChatFeedLinks.js); another chat
// (a note's, a card's) comes on screen in the panel; a document opens on
// the Resume page, asked for before going there so the workspace, mounting
// on arrival, opens that one first.
export function chatLinks({ feedLinks, apply }) {
  return {
    onApply: feedLinks.onApply,
    onOpenRef: feedLinks.onOpenRef,
    onOpenChat: (id) => openChat(id),
    onOpenDocument: (id) => {
      requestOpenDocument(id);
      apply.setView?.('resume');
    },
  };
}
