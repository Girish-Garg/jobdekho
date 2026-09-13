import AiGate from './AiGate.jsx';
import FakeCheck from './FakeCheck.jsx';
import CoverLetter from './CoverLetter.jsx';

// The AI actions a posting offers, in one block of the detail view. Each
// action is a component taking { posting, cli } (cli as AiGate hands it) and
// owning its own button, progress and result; adding one is that component
// plus an entry in this list. An action the detail view has placed elsewhere
// for this posting is passed in `skip` so it is not offered twice.
export const ACTIONS = [FakeCheck, CoverLetter];

const INTRO = 'The actions here ask an AI CLI installed on this computer, on your own subscription.';

export default function AiSection({ posting, skip = [] }) {
  const actions = ACTIONS.filter((action) => !skip.includes(action));
  if (!actions.length) return null;

  return (
    <div className="rounded-md bg-paper px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">AI</p>
      <div className="mt-1.5 flex flex-col gap-4">
        <AiGate intro={INTRO}>
          {(cli) => actions.map((Action, i) => <Action key={i} posting={posting} cli={cli} />)}
        </AiGate>
      </div>
    </div>
  );
}
