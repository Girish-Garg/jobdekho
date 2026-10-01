import { useEffect, useRef } from 'react';
import { elapsedText } from '../lib/aiSteps.js';
import { useNow } from '../lib/useNow.js';
import ApplyChatMessage from './ApplyChatMessage.jsx';
import ChatText from './ChatText.jsx';
import ChatInput from './ChatInput.jsx';

const DRAFT = 'Draft answers for the questions left on this page that my resume can answer, and ask me about the rest.';

// The AI beside the form (see the server's apply/ask-run.js): ask it what to
// put, have it write an answer from your resume, or tell it it got one wrong.
// It says first what is left on the page for you, so a question it cannot
// answer on its own is put to you rather than guessed. The wheel stays yours:
// Stop ends a message being answered, Take over (or any press in the window)
// stops it mid-fill, and passwords, codes, uploads and Submit never leave
// your hands.
export default function ApplyChat({ view, chat, onTakeOver }) {
  const end = useRef(null);
  // Only what it can help with: a password or a code is the person's alone.
  const left = (view.rows ?? []).filter((row) => row.status === 'you' && row.askable !== false);
  const busy = Boolean(chat.pending);

  useEffect(() => {
    end.current?.scrollIntoView?.({ block: 'end' });
  }, [chat.messages.length, chat.pending?.text]);

  return (
    <section aria-label="Ask AI about this form" className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="flex flex-col gap-4 py-1">
          <div className="rounded-xl border border-line bg-select/50 p-3 text-sm text-muted">
            {left.length > 0 ? (
              <>
                <p>
                  <span className="font-semibold text-ink">{left.length === 1 ? 'One question here needs you' : `${left.length} questions here need you`}: </span>
                  {left.map((row) => row.label).join(', ')}.
                </p>
                <p className="mt-1">Tell me what to put, or I can draft what your resume answers and ask you the rest.</p>
                <button type="button" disabled={busy} onClick={() => chat.ask(DRAFT)} className="btn btn-quiet btn-sm mt-2.5">Draft from my resume</button>
              </>
            ) : (
              <p>Ask me what to put in any question here, or to write an answer from your resume. Passwords, codes, uploads and Submit stay yours.</p>
            )}
          </div>
          {chat.messages.map((message, i) => <ApplyChatMessage key={i} message={message} />)}
          {chat.pending && <Pending pending={chat.pending} />}
          <div ref={end} />
        </div>
      </div>
      {view.state === 'filling' && !busy && (
        <p className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-xs text-muted">
          <span className="min-w-0 flex-1">JobDekho is filling. Press anything in the window to stop it.</span>
          <button type="button" onClick={onTakeOver} className="btn btn-quiet btn-sm shrink-0">Take over</button>
        </p>
      )}
      <ChatInput busy={busy} onSend={chat.ask} onStop={busy ? chat.stop : null} placeholder="Tell it what to put, or ask for an answer" submitLabel="Send" />
    </section>
  );
}

function Pending({ pending }) {
  const now = useNow(true);
  return (
    <div aria-busy="true" className="flex flex-col gap-2">
      <p className="flex items-center gap-2 text-xs text-muted">
        <span aria-hidden="true" className="breathe h-1.5 w-1.5 rounded-full bg-primary" />
        {pending.text ? 'Writing' : 'Thinking'}
        <span className="tnum">{elapsedText(now - pending.startedAt)}</span>
      </p>
      {pending.text && <ChatText text={pending.text} className="writing" />}
    </div>
  );
}
