import { requestOpenDocument } from './openDocumentSignal.js';
import { scopeFor } from './madeByAi.js';

// Where History's links go, each closing History on the way so the person
// lands on what they asked for rather than on the list they came from:
//
//   onContinued     a filed conversation continued, now the current one
//   onOpenRef       a job named in an old answer, or one something was made
//                   for, opened on the feed (see useChatFeedLinks.js); the
//                   chat follows the open job, so its cards come with it
//   onApply         a filter or sort an old answer offered
//   onShowCards     a job's saved answers shown in the chat, which works for
//                   a job the feed no longer holds too
//   onOpenDocument  a document opened on the Resume page
export function historyLinks({ chat, scope, feedLinks, onFeed, apply, close }) {
  const then = (act) => (...args) => {
    act(...args);
    close();
  };
  return {
    onClose: close,
    onContinued: then((conversation) => chat.switchTo(conversation)),
    onOpenRef: then((id) => feedLinks.onOpenRef(id)),
    onApply: then((action) => feedLinks.onApply(action)),
    onShowCards: then((item) => {
      scope.focus(scopeFor(item));
      if (!onFeed) apply.setView?.('postings');
    }),
    onOpenDocument: then((id) => {
      requestOpenDocument(id);
      apply.setView?.('resume');
    }),
  };
}
