import { useState } from 'react';
import { elapsedText } from '../lib/aiSteps.js';
import Button from './ui/Button.jsx';
import ChatBubble from './ChatBubble.jsx';
import ChatText from './ChatText.jsx';
import ChatConfirm from './ChatConfirm.jsx';
import { WarningIcon } from './Icon.jsx';

// A call that got no answer, kept in the chat it was asked in, and only
// there, instead of lost with the retyping it would take: stopped, with
// what had been written by then, or failed, with the reason in the server's
// own words, once, here rather than in a red line and a toast both. Ask
// again sends it the way it went the first time. Edit question (a question
// only, `onEdit`) puts it back in the box to change, asking first when the
// box already holds something, so a draft is never overwritten unseen. A
// CLI that went missing also gets the re-probe.
export default function ChatMissed({ missed, hasDraft = false, onAgain, onEdit = null, onRecheck, checking = false }) {
  const [asking, setAsking] = useState(false);

  if (missed.kind === 'stopped') {
    return (
      <div className="flex flex-col gap-3">
        <ChatBubble>{missed.question}</ChatBubble>
        {missed.text && <div className="opacity-60"><ChatText text={missed.text} /></div>}
        <div className="flex items-center gap-2 text-xs text-muted">
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-[2px] bg-muted" />
          <span className="mr-auto">You stopped it after {elapsedText(missed.elapsedMs)}</span>
          <Button size="sm" onClick={onAgain}>Ask again</Button>
        </div>
      </div>
    );
  }

  const edit = () => {
    setAsking(false);
    onEdit();
  };

  return (
    <div className="flex flex-col gap-3">
      <ChatBubble>{missed.question}</ChatBubble>
      <div role="alert" className="rounded-xl border border-ember/30 bg-ember/5 p-3.5">
        <p className="flex items-center gap-2 text-sm font-semibold text-ember">
          <WarningIcon size={14} />
          No answer this time
        </p>
        <p className="mt-1 text-sm text-muted">{missed.message}</p>
        {asking ? (
          <ChatConfirm question="Replace what you have typed with this question?" yes="Replace it" no="Keep mine" danger={false} onYes={edit} onNo={() => setAsking(false)} className="mt-3" />
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={onAgain}>{onEdit ? 'Ask again' : 'Try again'}</Button>
            {onEdit && <Button variant="ghost" size="sm" onClick={hasDraft ? () => setAsking(true) : edit}>Edit question</Button>}
            {missed.kind === 'not_found' && onRecheck && (
              <Button variant="ghost" size="sm" disabled={checking} onClick={onRecheck}>
                {checking ? 'Checking...' : 'Check again'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
