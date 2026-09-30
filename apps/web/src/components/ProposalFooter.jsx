import { shortStamp } from '../lib/time.js';
import { CheckIcon, WarningIcon } from './Icon.jsx';

const APPLY = 'inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-on-primary shadow-raise '
  + 'transition duration-fast ease hover:brightness-110 disabled:cursor-not-allowed disabled:bg-ink/10 disabled:text-muted disabled:shadow-none disabled:hover:brightness-100';
const DISCARD = 'rounded-full border border-line px-4 py-1.5 text-sm font-medium text-muted transition-colors duration-fast ease '
  + 'hover:border-edge hover:text-ink disabled:opacity-50';

// The foot of a proposal card: the two buttons while it waits, or what
// became of it. Apply is saffron because it is the one thing on the card
// that acts; a card the guard refused keeps it, disabled, so the person
// sees what is missing rather than a button that has gone. A refusal from
// the server is said in its own words, under the buttons that caused it.
function Refusal({ error }) {
  return (
    <div role="alert" className="flex items-start gap-2 text-sm text-ember">
      <WarningIcon size={14} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <p>{error.message}</p>
        {error.problems.length > 0 && (
          <ul className="mt-1 list-disc pl-4 font-mono text-xs text-ink/80">
            {error.problems.map((problem) => <li key={problem}>{problem}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function ProposalFooter({ state, blocked }) {
  if (state.status === 'applied') {
    return (
      <p className="flex items-center gap-1.5 text-sm font-semibold text-applied">
        <CheckIcon size={14} />
        Applied{state.appliedAt ? ` ${shortStamp(state.appliedAt)}` : ''}
      </p>
    );
  }
  if (state.status === 'discarded') return <p className="text-sm text-muted">Discarded. Nothing was changed.</p>;
  if (state.status === 'refused') return <p className="text-sm text-muted">Nothing to apply. Nothing was changed.</p>;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={state.apply} disabled={blocked || Boolean(state.busy)} className={APPLY}>
          <CheckIcon size={14} />
          {state.busy === 'apply' ? 'Applying...' : 'Apply'}
        </button>
        <button type="button" onClick={state.discard} disabled={Boolean(state.busy)} className={DISCARD}>
          {state.busy === 'discard' ? 'Discarding...' : 'Discard'}
        </button>
        <span className="text-xs text-muted">{blocked ? 'Fix the lines above first.' : 'Nothing changes until you apply.'}</span>
      </div>
      {state.error && <Refusal error={state.error} />}
    </div>
  );
}
