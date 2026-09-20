import ChatPanelBody from './ChatPanelBody.jsx';

// The conversation about what is on screen: the feed as it is filtered right
// now, the posting open beside it, and the career record, all read fresh by
// the server on every question (see apps/server/src/chat/context.js) so a
// person can ask "why is this ranked here" or "which of these pay over 20
// lakh" without learning the filter bar first.
//
// A panel rather than a page, on the left where the list already is, so the
// answer and the rows it is about are visible at the same time. This stays a
// plain gate: the real component is ChatPanelBody, mounted only while open,
// so its hooks - loading the conversation, probing for a CLI - never run
// while the panel is closed, matching what the panel looked like before it
// asked either of them.
export default function AiChatPanel({ open, onClose, context, apply }) {
  if (!open) return null;
  return <ChatPanelBody onClose={onClose} context={context} apply={apply} />;
}
