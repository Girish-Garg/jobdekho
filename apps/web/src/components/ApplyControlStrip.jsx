import Button from './ui/Button.jsx';
import { controlFor, progressOf, hostOf } from '../lib/applyControl.js';
import { CheckIcon, PointerIcon, SparkleIcon, WarningIcon, WindowIcon } from './Icon.jsx';

// The bar under the live page: who has the wheel, in a word and a colour, the
// server's own sentence for why (apply/handover-copy.js), and the press that
// fits (lib/applyControl.js). While JobDekho fills, how far it has got and
// Take control; after, the person's turn with Fill this page, or the sign-in
// that needs them, or the form that is theirs to send. Never a Submit.
const TONE = {
  busy: 'bg-primary/15 text-primary',
  yours: 'bg-primary/15 text-primary',
  done: 'bg-applied/15 text-applied',
  stop: 'bg-ember/15 text-ember',
};

function Mark({ control, view }) {
  if (control.tone === 'done') return <CheckIcon size={13} />;
  if (control.tone === 'stop') return <WarningIcon size={13} />;
  if (view.reason === 'google-blocked') return <WindowIcon size={13} />;
  if (control.tone === 'busy') return <SparkleIcon size={13} />;
  return <PointerIcon size={13} />;
}

export default function ApplyControlStrip({ view, onAction }) {
  const control = controlFor(view, hostOf(view.url));
  const filling = view.state === 'filling';
  const { done, total } = progressOf(view.rows);
  return (
    <div role="status" aria-live="polite" className="flex flex-wrap items-center gap-3 border-t border-line bg-panel px-4 py-2.5">
      <span aria-hidden="true" className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${TONE[control.tone]} ${control.tone === 'busy' ? 'breathe' : ''}`}>
        <Mark control={control} view={view} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">
          {control.head}
          {filling && total > 0 && <span className="font-normal text-muted"> · {done} of {total}</span>}
        </p>
        {filling && total > 0 ? (
          <div aria-hidden="true" className="mt-1 h-1 w-48 max-w-full overflow-hidden rounded-full bg-edge">
            <div className="h-full rounded-full bg-primary transition-[width] duration-slow ease" style={{ width: `${Math.round((done / total) * 100)}%` }} />
          </div>
        ) : (
          view.message && <p className="text-xs text-muted">{view.message}</p>
        )}
      </div>
      {filling && <span className="hidden text-xs text-muted xl:inline">Nothing is sent until you press Submit</span>}
      {control.actions.map((a) => (
        <Button key={a.id} size="sm" onClick={() => onAction(a.id)} className="shrink-0" variant={a.primary ? 'primary' : 'quiet'}>
          {a.id === 'window' && <WindowIcon size={12} />}
          {a.label}
        </Button>
      ))}
    </div>
  );
}
