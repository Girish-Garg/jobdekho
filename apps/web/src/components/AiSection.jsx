import AiGate from './AiGate.jsx';
import FakeCheck from './FakeCheck.jsx';
import CoverLetter from './CoverLetter.jsx';
import ResumeTailor from './ResumeTailor.jsx';

// The AI actions a posting offers, in one block of the detail view. Each
// action is a component taking { posting, cli } (cli as AiGate hands it),
// carrying its tool policy and hint sentence as statics, and owning its own
// button, progress and result; adding one is that component plus an entry
// in this list. An action the detail view has placed elsewhere for this
// posting is passed in `skip` so it is not offered twice.
export const ACTIONS = [FakeCheck, CoverLetter, ResumeTailor];

const INTRO = 'The actions here ask an AI CLI installed on this computer, on your own subscription.';

export default function AiSection({ posting, skip = [] }) {
  const actions = ACTIONS.filter((action) => !skip.includes(action));
  if (!actions.length) return null;

  return (
    <div className="rounded-md bg-paper px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">AI</p>
      {/* A hairline between rows, not a gap: a task list, not a stack of
          cards. Each action owns its own vertical padding so this still
          looks right whether one row is offered or three. */}
      <div className="mt-1 flex flex-col divide-y divide-line">
        <AiGate intro={INTRO} posting={posting} actions={actions} />
      </div>
    </div>
  );
}
