// The line over the live view saying whose turn it is, in the server's own
// words (apply/handover-copy.js), with the one press that fits: go on filling,
// fill a new page, or mark the job applied once the site confirms it. Saffron
// is "your turn", green the finished form, red a posting that is gone.
const HEAD = {
  starting: 'Opening',
  filling: 'Filling',
  yours: 'Your turn',
  review: 'Review and submit it yourself',
};

const WALLS = new Set(['sign-in', 'account', 'code', 'human-check']);

// Two reasons outrank the state: a gone posting, and a form the site says
// was sent, which is no longer "review and submit".
function headOf(view) {
  if (view.reason === 'closed') return 'This posting looks closed';
  if (view.reason === 'submitted') return 'Looks submitted';
  if (view.reason === 'click-through') return 'Go on to the application';
  return HEAD[view.state] ?? '';
}

function toneOf(view) {
  if (view.reason === 'closed') return 'border-ember/30 bg-ember/10';
  if (view.state === 'review') return 'border-applied/30 bg-applied/10';
  if (view.state === 'yours') return 'border-primary/30 bg-primary/10';
  return 'border-line bg-select';
}

export default function ApplyBanner({ view, onFill, onApplied }) {
  const busy = view.state === 'starting' || view.state === 'filling';
  const fillWord = WALLS.has(view.reason) ? 'Continue filling' : 'Fill this page';
  return (
    <div role="status" aria-live="polite" className={`rise flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 ${toneOf(view)}`}>
      {busy && <span aria-hidden="true" className="typing-dot h-2 w-2 rounded-full bg-muted" />}
      <p className="min-w-0 flex-1 text-sm text-ink">
        <span className="font-semibold">{headOf(view)}. </span>
        {view.message}
      </p>
      {view.state === 'yours' && view.reason !== 'closed' && (
        <button type="button" onClick={onFill} className="btn btn-primary btn-sm">{fillWord}</button>
      )}
      {view.state === 'review' && view.reason === 'submitted' && (
        <button type="button" onClick={onApplied} className="btn btn-primary btn-sm">Mark as applied</button>
      )}
      {view.state === 'review' && view.reason !== 'submitted' && (
        <button type="button" onClick={onFill} className="btn btn-quiet btn-sm">Fill this page again</button>
      )}
    </div>
  );
}
