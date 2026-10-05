import { fillFraction, fillSteps, retrying } from '../lib/fillSteps.js';
import { elapsedText } from '../lib/aiSteps.js';
import { useNow } from '../lib/useNow.js';
import { CheckIcon } from './Icon.jsx';

function Mark({ state }) {
  if (state === 'done') {
    return (
      <span aria-hidden="true" className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-applied/20 text-applied">
        <CheckIcon size={10} />
      </span>
    );
  }
  if (state === 'current') {
    return (
      <span aria-hidden="true" className="grid h-4 w-4 shrink-0 place-items-center">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary/25 border-t-primary [animation-duration:1.2s] motion-reduce:animate-none" />
      </span>
    );
  }
  return <span aria-hidden="true" className="h-4 w-4 shrink-0 rounded-full border border-edge" />;
}

// The resume card while the AI reads the resume: a checklist from the
// call's own events (see fillSteps.js), the seconds counted on the step
// being waited on, and a thin bar that eases on without ever claiming to
// know how far along the CLI is. `startedAt` is when the run was asked
// for; the clock counts from it every second rather than on the server's
// five-second heartbeat, which would read as stuck in between.
//
// No Stop: the extraction is not one of the calls the chat's stop reaches
// (see the server's chat/in-flight.js), and dropping the request would
// leave the CLI reading on regardless, so a Stop here would do nothing.
export default function FillProgress({ events, label, startedAt, finished }) {
  const now = useNow(!finished);
  const elapsed = Math.max(0, now - startedAt);
  const steps = fillSteps(events, { label, finished });
  const current = steps.find((step) => step.state === 'current');

  return (
    <div aria-busy={!finished} className="flex flex-col gap-3 border-t border-line pt-4">
      <p className="text-sm font-semibold text-ink">Reading your resume</p>
      <ol aria-label="Progress" className="flex flex-col gap-2.5 text-sm">
        {steps.map((step) => (
          <li key={step.key} aria-current={step.state === 'current' ? 'step' : undefined} className={`flex items-center gap-2.5 ${step.state === 'current' ? 'text-ink' : 'text-muted'}`}>
            <Mark state={step.state} />
            <span className="min-w-0 flex-1">{step.text}</span>
            {step.key === 'read' && step.state === 'current' && <span className="tnum shrink-0 text-xs text-muted">{elapsedText(elapsed)}</span>}
          </li>
        ))}
      </ol>
      <p aria-live="polite" className="sr-only">{current?.text ?? 'Ready for you to review'}</p>
      {retrying(events) && <p className="text-xs text-muted">{label} was busy signing itself in. Trying again.</p>}
      <div aria-hidden="true" className="mt-1 h-1 overflow-hidden rounded-full bg-select">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
          style={{ width: `${Math.round(fillFraction(elapsed, finished) * 100)}%` }}
        />
      </div>
      <p className="-mt-1 text-xs text-muted">Usually 20 to 40 seconds</p>
    </div>
  );
}
