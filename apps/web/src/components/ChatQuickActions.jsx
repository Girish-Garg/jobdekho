import { ACTION_KINDS, ACTION_ORDER } from '../lib/chatActionKinds.js';
import Button from './ui/Button.jsx';
import ChatActionIcon from './ChatActionIcon.jsx';

// The three things the chat can do to its job, one click each. A kind
// already answered in this chat offers to go again in words that say so,
// so a job already checked never costs a second call because the same
// button was clicked twice. Held back until the chat's answers are known
// for the same reason, and while another call runs, with why (`waitReason`)
// as their tooltip.
export default function ChatQuickActions({ results, waitReason = null, onRun }) {
  const saved = new Set((results ?? []).map((record) => record.kind));

  return (
    <div role="group" aria-label="Actions for this job" className="flex flex-wrap gap-1">
      {ACTION_ORDER.map((kind) => (
        <Button
          key={kind}
          size="sm"
          disabled={Boolean(waitReason) || results === undefined}
          title={waitReason ?? undefined}
          onClick={() => onRun(kind)}
          className="bg-paper px-2.5 py-1.5"
        >
          <ChatActionIcon kind={kind} size={13} className="text-primary" />
          {saved.has(kind) ? ACTION_KINDS[kind].again : ACTION_KINDS[kind].label}
        </Button>
      ))}
    </div>
  );
}
