import { elapsedText } from '../lib/aiSteps.js';
import ChatBubble from './ChatBubble.jsx';
import ChatText from './ChatText.jsx';
import { WarningIcon } from './Icon.jsx';

// A question that got no answer, kept where it was asked instead of lost
// with the retyping it would take: stopped, with what had been written by
// then, or failed, with the reason in the server's own words, once, here
// rather than in a red line and a toast both. Ask again sends it the way it
// went the first time; Edit question puts it back in the box to change. A
// CLI that went missing also gets the re-probe, since its sentence ends in
// "restart" and a person who just fixed that wants to check without one.
export default function ChatMissed({ missed, onAgain, onEdit, onRecheck, checking = false }) {
  if (missed.kind === 'stopped') {
    return (
      <div className="flex flex-col gap-3">
        <ChatBubble>{missed.question}</ChatBubble>
        {missed.text && <div className="opacity-60"><ChatText text={missed.text} /></div>}
        <div className="flex items-center gap-2 text-xs text-muted">
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-[2px] bg-muted" />
          <span className="mr-auto">You stopped it after {elapsedText(missed.elapsedMs)}</span>
          <button type="button" onClick={onAgain} className="btn btn-quiet btn-sm">Ask again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ChatBubble>{missed.question}</ChatBubble>
      <div role="alert" className="rounded-xl border border-ember/30 bg-ember/5 p-3.5">
        <p className="flex items-center gap-2 text-sm font-semibold text-ember">
          <WarningIcon size={14} />
          No answer this time
        </p>
        <p className="mt-1 text-sm text-muted">{missed.message}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={onAgain} className="btn btn-quiet btn-sm">Ask again</button>
          <button type="button" onClick={onEdit} className="btn btn-ghost btn-sm">Edit question</button>
          {missed.kind === 'not_found' && onRecheck && (
            <button type="button" disabled={checking} onClick={onRecheck} className="btn btn-ghost btn-sm">
              {checking ? 'Checking...' : 'Check again'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
