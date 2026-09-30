import { aiSteps, elapsedText } from '../lib/aiSteps.js';
import { useNow } from '../lib/useNow.js';
import ChatBubble from './ChatBubble.jsx';
import ChatText from './ChatText.jsx';

// Past this, a line says the panel can be closed: a wait long enough to
// wonder about is when it is worth knowing the answer will wait too.
const LONG_WAIT_MS = 15000;

// The call in flight, laid out the way the answer will be: what was asked,
// at once, so the person sees it went, then one quiet line for who is
// answering, what it is doing and a clock that counts every second (not
// only on the server's five-second heartbeat), and under it the answer
// itself as it is written, the caret at its end (see the server's
// chat/reply-stream.js). A CLI that cannot stream shows the line alone
// until the whole answer lands.
export default function ChatPending({ call, providers = [] }) {
  const now = useNow(true);
  // Looked up as it is drawn, not only when the call started: a question sent
  // the moment the panel opened can start before the list of CLIs arrives,
  // and the line would keep saying "ollama" where it means "Ollama".
  const named = providers.find((p) => p.id === call.provider)?.label || call.label || '';
  const steps = aiSteps(call.events, { label: named, doing: call.what.doing ?? 'thinking' });
  const current = steps.find((step) => step.state === 'current');
  const waited = now - call.startedAt;

  return (
    <div className="flex flex-col gap-4">
      <ChatBubble rise note={call.what.changing ? `Changing: ${call.what.changing}` : null}>{call.what.say}</ChatBubble>
      <section aria-label="Answer in progress" aria-busy="true" className="rise flex flex-col gap-2">
        <p className="flex items-center gap-2 text-xs text-muted">
          <span aria-hidden="true" className="breathe h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span aria-live="polite" className="min-w-0 truncate">{status(call, current, named)}</span>
          <span title="Time since you asked" className="tnum shrink-0">{elapsedText(waited)}</span>
        </p>
        {call.text && <ChatText text={call.text} className="writing" />}
        {waited > LONG_WAIT_MS && (
          <p className="text-[11px] text-muted">
            {call.remote
              ? 'Asked before this page reloaded. The answer will show here when it lands.'
              : 'You can close this panel. The answer will be here when you come back.'}
          </p>
        )}
      </section>
    </div>
  );
}

// Who is answering and what it is doing: the web said plainly as the
// question alone (never the profile), and a sign-in retry named for what it
// is rather than left to look like a stall.
function status(call, current, named) {
  const who = named || 'Your AI';
  if (call.events.at(-1)?.stage === 'retry') return `${who} was busy signing itself in. Trying again`;
  if (current?.key === 'web') return 'Checking the web with your question only, not your profile';
  if (call.text) return `${who} is writing`;
  if (current?.key === 'send') return `Sending to ${who}`;
  return `${who}, ${current?.text.toLowerCase() ?? 'working'}`;
}
