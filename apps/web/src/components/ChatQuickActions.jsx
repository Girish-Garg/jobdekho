import { ACTION_KINDS, ACTION_ORDER } from '../lib/chatActionKinds.js';

// The three things the chat can do to the job in scope, one click each.
// A kind already answered offers to go again in words that say so, so a job
// already checked never costs a second call because the same button was
// clicked twice. Held back until the saved answers are known for the same
// reason.
export default function ChatQuickActions({ results, busy, onRun }) {
  const saved = new Set((results ?? []).map((record) => record.kind));

  return (
    <div role="group" aria-label="Actions for this job" className="flex flex-wrap gap-1.5 px-3 pt-3">
      {ACTION_ORDER.map((kind) => (
        <button
          key={kind}
          type="button"
          disabled={busy || results === undefined}
          onClick={() => onRun(kind)}
          className="rounded-md border border-line px-2.5 py-1 text-sm text-ink transition-colors duration-fast ease hover:border-edge disabled:opacity-50"
        >
          {saved.has(kind) ? ACTION_KINDS[kind].again : ACTION_KINDS[kind].label}
        </button>
      ))}
    </div>
  );
}
