import { aiSteps, elapsedText } from '../lib/aiSteps.js';
import { useNow } from '../lib/useNow.js';
import ChatBubble from './ChatBubble.jsx';
import { CheckIcon, SparkleIcon } from './Icon.jsx';

const STEP_TONE = { done: 'text-muted', current: 'font-semibold text-ink', next: 'text-muted/70' };

// The call in flight: what was asked, at once, so the person sees it went,
// then a card for the wait. Who is answering, a clock that counts every
// second from when it was asked (not only on the server's five-second
// heartbeat), and the steps it has been through, so a minute-long answer
// reads as work going on rather than as a hang. It says the panel can be
// closed, because the answer now waits for it (see lib/chatSession.js).
export default function ChatPending({ call, providers = [] }) {
  const now = useNow(true);
  const named = call.label || providers.find((p) => p.id === call.provider)?.label || '';
  const steps = aiSteps(call.events, { label: named, doing: call.what.doing ?? 'thinking' });
  const current = steps.find((step) => step.state === 'current');

  return (
    <div className="flex flex-col gap-4">
      <ChatBubble rise note={call.what.changing ? `Changing: ${call.what.changing}` : null}>{call.what.say}</ChatBubble>
      <section aria-label="Answer in progress" className="rise rounded-2xl border border-line bg-panel p-4 shadow-raise">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="relative grid h-9 w-9 shrink-0 place-items-center">
            <span className="absolute inset-0 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
            <SparkleIcon size={14} className="text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{named || 'Your AI'}</p>
            <p aria-live="polite" className="text-xs text-muted">{headline(call, current, named)}</p>
          </div>
          <span title="Time since you asked" className="tnum shrink-0 rounded-full bg-select px-2.5 py-1 text-xs font-semibold text-ink">
            {elapsedText(now - call.startedAt)}
          </span>
        </div>
        <ol aria-label="Progress" className="mt-4 flex flex-col gap-2 border-t border-line pt-3">
          {steps.map((step) => <Step key={step.key} step={step} />)}
        </ol>
        <p className="mt-3 text-[11px] text-muted">
          {call.remote
            ? 'Asked before this page reloaded. The answer will show here when it lands.'
            : 'You can close this panel. The answer will be here when you come back.'}
        </p>
      </section>
    </div>
  );
}

// The line under the name: the step it is on, the web said plainly as the
// question alone (never the profile), and a sign-in retry named for what it
// is rather than left to look like a stall.
function headline(call, current, named) {
  if (call.events.at(-1)?.stage === 'retry') return `${named || 'The CLI'} was busy signing itself in. Trying again...`;
  if (current?.key === 'web') return 'Checking the web with your question only, not your profile...';
  return `${current?.text ?? 'Working'}...`;
}

function Step({ step }) {
  return (
    <li aria-current={step.state === 'current' ? 'step' : undefined} className={`flex items-center gap-2.5 text-xs ${STEP_TONE[step.state]}`}>
      <span aria-hidden="true" className="grid h-4 w-4 shrink-0 place-items-center">
        {step.state === 'done' && (
          <span className="grid h-4 w-4 place-items-center rounded-full bg-applied/15 text-applied"><CheckIcon size={10} /></span>
        )}
        {step.state === 'current' && <span className="breathe h-2 w-2 rounded-full bg-primary" />}
        {step.state === 'next' && <span className="h-2 w-2 rounded-full border border-edge" />}
      </span>
      {step.text}
      {step.state === 'done' && <span className="sr-only"> (done)</span>}
    </li>
  );
}
