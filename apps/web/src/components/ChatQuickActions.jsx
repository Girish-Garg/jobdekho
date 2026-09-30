import { ACTION_KINDS, ACTION_ORDER } from '../lib/chatActionKinds.js';
import ChatActionIcon from './ChatActionIcon.jsx';

// The three things the chat can do to the job in scope, one click each.
// A kind already answered offers to go again in words that say so, so a job
// already checked never costs a second call because the same button was
// clicked twice. Held back until the saved answers are known for the same
// reason.
export default function ChatQuickActions({ results, busy, onRun }) {
  const saved = new Set((results ?? []).map((record) => record.kind));

  return (
    <div role="group" aria-label="Actions for this job" className="flex flex-wrap gap-1">
      {ACTION_ORDER.map((kind) => (
        <button
          key={kind}
          type="button"
          disabled={busy || results === undefined}
          onClick={() => onRun(kind)}
          className="btn btn-quiet btn-sm group bg-paper px-2.5 py-1.5"
        >
          <ChatActionIcon kind={kind} size={13} className="text-primary" />
          {saved.has(kind) ? ACTION_KINDS[kind].again : ACTION_KINDS[kind].label}
        </button>
      ))}
    </div>
  );
}
