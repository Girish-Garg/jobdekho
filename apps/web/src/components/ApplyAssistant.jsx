import { useEffect, useRef, useState } from 'react';
import { localDraft } from '../lib/chatDraftSignal.js';
import Button from './ui/Button.jsx';
import IconButton from './ui/IconButton.jsx';
import ApplyTimeline from './ApplyTimeline.jsx';
import ApplyChatMessage, { ApplyPending } from './ApplyChatMessage.jsx';
import ApplyComposer from './ApplyComposer.jsx';
import ApplyCopyPanel from './ApplyCopyPanel.jsx';
import { CloseIcon } from './Icon.jsx';

const DONE = new Set(['filled', 'attached', 'kept', 'done']);

// The column beside the browser: one running account of the application, what
// happened on the page (ApplyTimeline.jsx) and then the conversation with the
// AI about it (see the server's apply/ask-run.js), with the box at the foot.
// It asks before it guesses, Stop ends a message being answered, and Take
// control (or any press in the window) stops it mid-fill. The details to copy
// slide over it when the header asks for them.
export default function ApplyAssistant({ view, chat, onHover, onTakeOver, copy }) {
  const [draft, setDraft] = useState(null);
  const end = useRef(null);
  const rows = view?.rows ?? [];

  useEffect(() => {
    end.current?.scrollIntoView?.({ block: 'end' });
  }, [chat.messages.length, chat.pending?.text]);

  return (
    <aside aria-label="Assistant" className="relative flex min-h-[22rem] flex-col border-t border-line lg:min-h-0 lg:border-l lg:border-t-0">
      <div className="flex items-center gap-2 px-4 py-3">
        <p className="text-sm font-semibold text-ink">Assistant</p>
        {view && (
          <span className="ml-auto text-xs text-muted">
            {rows.filter((row) => DONE.has(row.status)).length} answered · {rows.filter((row) => row.status === 'you').length} need you
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
        <div className="flex flex-col gap-4">
          <ApplyTimeline view={view} onHover={onHover} onPick={(row) => setDraft(localDraft(`For "${row.label}": `))} />
          {chat.messages.map((message, i) => <ApplyChatMessage key={i} message={message} />)}
          {chat.pending && <ApplyPending pending={chat.pending} />}
          <div ref={end} />
        </div>
      </div>
      {view?.state === 'filling' && !chat.pending && (
        <p className="mx-3 mb-2 flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-xs text-muted">
          <span className="min-w-0 flex-1">JobDekho is filling. Any press in the window stops it.</span>
          <Button variant="quiet" size="sm" onClick={onTakeOver} className="shrink-0">Take control</Button>
        </p>
      )}
      <ApplyComposer chat={chat} draft={draft} disabled={!view} />
      {copy.open && (
        <div className="absolute inset-0 z-10 flex flex-col bg-panel">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <p className="flex-1 text-sm font-semibold text-ink">Copy your details</p>
            <IconButton label="Back to the assistant" onClick={copy.close}><CloseIcon size={13} /></IconButton>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <ApplyCopyPanel postingId={copy.postingId} sessionId={view?.id} files={view?.files} />
          </div>
        </div>
      )}
    </aside>
  );
}
