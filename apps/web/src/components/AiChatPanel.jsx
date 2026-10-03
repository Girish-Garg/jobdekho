import ChatPanelBody from './ChatPanelBody.jsx';

// The one place AI happens: the chats, one per job, per document and per
// comparison, and general ones (see lib/activeChat.js for which is on
// screen), each read fresh by the server on every question (see
// apps/server/src/chat/thread-context.js), and the posting actions, whose
// answers land in the job's own chat.
//
// A panel rather than a page, on the left where the list already is, so the
// answer and the rows it is about are visible at the same time. This stays a
// plain gate: the real component is ChatPanelBody, mounted only while open,
// so its hooks (reading the chat, probing for a CLI) never run while the
// panel is closed. `request` is the job pane's "Ask AI about this job" (see
// lib/askAiSignal.js), handed through by Shell, and `draft` the Profile
// page's "Add with AI" words for the box (see lib/chatDraftSignal.js).
export default function AiChatPanel({ open, onClose, context, apply, request = null, draft = null }) {
  if (!open) return null;
  return <ChatPanelBody onClose={onClose} context={context} apply={apply} request={request} draft={draft} />;
}
