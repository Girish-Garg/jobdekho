import Button from './ui/Button.jsx';
import { DocumentIcon, PenIcon } from './Icon.jsx';

// A comparison's own two actions, each one AI call (see the server's
// chat/tailor-all.js and chat/letters-each.js): one resume aimed at what
// the jobs share, and a letter for each job, saved with that job and shown
// in its chat. Each needs enough of its jobs still listed, and waits, with
// why as its tooltip, while another call runs.
const ACTIONS = [
  { which: 'tailor-all', label: 'Tailor resume for all', Icon: DocumentIcon, fewest: 2 },
  { which: 'letters-each', label: 'Cover letter for each', Icon: PenIcon, fewest: 1 },
];

export default function ChatCompareActions({ view, waitReason = null, onRun }) {
  const listed = view.jobs.filter((job) => job.listed !== false).length;
  return (
    <div role="group" aria-label="Actions for these jobs" className="flex flex-wrap gap-1">
      {ACTIONS.map(({ which, label, Icon, fewest }) => {
        const short = listed < fewest ? `Needs ${fewest === 1 ? 'a job' : `${fewest} jobs`} JobDekho still lists` : null;
        return (
          <Button
            key={which}
            size="sm"
            disabled={Boolean(waitReason || short)}
            title={waitReason ?? short ?? undefined}
            onClick={() => onRun(which)}
            className="bg-paper px-2.5 py-1.5"
          >
            <Icon size={13} className="text-primary" />
            {label}
          </Button>
        );
      })}
    </div>
  );
}
