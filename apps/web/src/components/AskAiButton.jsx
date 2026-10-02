import { askAboutPosting } from '../lib/askAiSignal.js';
import { isDoubtful } from '../lib/chatActionKinds.js';
import Button from './ui/Button.jsx';
import Card from './ui/Card.jsx';
import { ArrowRightIcon, SparkleIcon, ShieldCheckIcon, PenIcon, DocumentIcon } from './Icon.jsx';

// The pane's way into AI: it hands this posting to the chat panel, where
// every AI action and its answer lives, instead of running any of them here.
// The three actions are offered by name as well, so the likeliest next step
// is one click rather than "open the chat, then find the button". On a
// posting the feed already doubts, the question on the person's mind is "is
// this real?", so that is the main control there. `onAsked` is for the dialog
// on a narrow screen, which has to get out of the way for the chat to show.
const QUICK = [
  ['fake-check', 'Is it real?', ShieldCheckIcon],
  ['cover-letter', 'Cover letter', PenIcon],
  ['resume-tailor', 'Tailor resume', DocumentIcon],
];

export default function AskAiButton({ posting, onAsked }) {
  const doubtful = isDoubtful(posting);
  const title = doubtful ? 'Check whether this job is real' : 'Ask AI about this job';
  const ask = (action) => {
    askAboutPosting(posting, action);
    onAsked?.();
  };

  return (
    <Card as="section" aria-label="AI" className="dither-spot rounded-xl p-4 hover:border-edge">
      <button type="button" aria-label={title} onClick={() => ask(doubtful ? 'fake-check' : null)} className="group flex w-full items-center gap-3 text-left">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-on-primary">
          <SparkleIcon size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">{title}</span>
          <span className="block text-xs leading-relaxed text-muted">
            {doubtful ? 'Looks the company and role up on the web. Only the posting is sent.' : 'Opens the chat on this job, on the AI CLI on this computer.'}
          </span>
        </span>
        <ArrowRightIcon className="text-muted transition-transform duration-fast ease group-hover:translate-x-0.5 group-hover:text-primary" />
      </button>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {QUICK.filter(([kind]) => !(doubtful && kind === 'fake-check')).map(([kind, label, Icon]) => (
          <Button key={kind} size="sm" onClick={() => ask(kind)} className="font-medium">
            <Icon size={13} />
            {label}
          </Button>
        ))}
      </div>
    </Card>
  );
}
