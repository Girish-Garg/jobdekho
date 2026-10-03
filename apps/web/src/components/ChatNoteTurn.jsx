import { companyOfTitle } from '../lib/chatNames.js';
import { ACTION_KINDS } from '../lib/chatActionKinds.js';
import ChatActionIcon from './ChatActionIcon.jsx';

// A job action pressed here that ran in the job's own chat (see the
// server's api/posting-ai.js): one quiet line saying where it went, with
// the way there. Not an answer, so it never counts as one, and the view
// stayed where the person was.
export default function ChatNoteTurn({ note, jobs = [], onOpenChat }) {
  const job = jobs.find((one) => one.id === note.postingId);
  const name = job?.company || companyOfTitle(note.title) || note.title || 'the job';
  const action = note.label || ACTION_KINDS[note.action]?.name || 'an action';
  return (
    <p className="flex items-center justify-center gap-2 text-xs text-muted">
      <ChatActionIcon kind={note.action} size={12} className="text-primary" />
      <span>
        Started {action} in{' '}
        <button type="button" onClick={() => onOpenChat(note.chatId)} className="link text-xs">{name}&apos;s chat</button>
      </span>
    </p>
  );
}
