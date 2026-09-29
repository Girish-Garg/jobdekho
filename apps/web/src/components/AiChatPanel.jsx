import ChatPanelBody from './ChatPanelBody.jsx';

// The one place AI happens: the conversation about what is on screen (the
// feed as it is filtered right now, the job in scope, the career record, all
// read fresh by the server on every question, see apps/server/src/chat/
// context.js), and the posting actions on that job, whose answers land in
// the same conversation.
//
// A panel rather than a page, on the left where the list already is, so the
// answer and the rows it is about are visible at the same time. This stays a
// plain gate: the real component is ChatPanelBody, mounted only while open,
// so its hooks - loading the conversation, probing for a CLI - never run
// while the panel is closed. `request` is the job pane's "Ask AI about this
// job" (see lib/askAiSignal.js), handed through by Shell.
export default function AiChatPanel({ open, onClose, context, apply, request = null }) {
  if (!open) return null;
  return <ChatPanelBody onClose={onClose} context={context} apply={apply} request={request} />;
}
