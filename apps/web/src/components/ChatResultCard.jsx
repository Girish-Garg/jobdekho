import { useEffect, useState } from 'react';
import { relativeDay } from '../lib/time.js';
import { ACTION_KINDS } from '../lib/chatActionKinds.js';
import FakeCheckResult, { VERDICT_WORD } from './FakeCheckResult.jsx';
import CoverLetterResult from './CoverLetterResult.jsx';
import ResumeTailorResult from './ResumeTailorResult.jsx';
import ChatActionIcon from './ChatActionIcon.jsx';
import { ChevronDownIcon, ChevronUpIcon } from './Icon.jsx';

const BODY = { 'fake-check': FakeCheckResult, 'cover-letter': CoverLetterResult, 'resume-tailor': ResumeTailorResult };

// The one line a folded card keeps: enough to tell versions apart without
// opening each, in the words the full result already uses.
const SUMMARY = {
  'fake-check': (r) => `${VERDICT_WORD[r.result?.verdict] || VERDICT_WORD.unclear}, checked ${relativeDay(r.createdAt)}`,
  'cover-letter': (r) => `Written ${relativeDay(r.createdAt)}`,
  'resume-tailor': (r) => {
    const flags = r.result?.factCheck?.flags?.length ?? 0;
    return `${flags ? `${flags} to check` : 'Nothing flagged'}, tailored ${relativeDay(r.createdAt)}`;
  },
};

// Controls inside a card do their own thing; a click anywhere else on the
// newest card makes it the reply target, which is what "click the card" means.
const OWN_CLICK = 'button, a, textarea, input, select, label';

const FRAME = 'overflow-hidden rounded-xl border bg-paper transition duration-fast ease';
const TARGETED = 'border-primary ring-4 ring-primary/15';

// One answer from a posting action, inside the conversation. The newest
// answer of each kind opens unfolded and can be made the reply target, which
// rings it in saffron so the person sees what their next words will change;
// an older one folds to a line, since the answer after it is the one to
// read, and cannot be targeted, since a refine always starts from the newest.
export default function ChatResultCard({ entry, providers, targeted, onTarget, onOpenBuilder }) {
  const { kind, record, latest } = entry;
  const [open, setOpen] = useState(latest);
  const Body = BODY[kind];
  const name = ACTION_KINDS[kind].name;

  useEffect(() => {
    if (!latest) setOpen(false);
  }, [latest]);

  function onCardClick(event) {
    if (latest && !event.target.closest(OWN_CLICK)) onTarget(kind);
  }

  return (
    <section aria-label={name} onClick={onCardClick} className={`${FRAME} ${targeted ? TARGETED : latest ? 'border-line hover:border-edge' : 'border-line'}`}>
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <ChatActionIcon kind={kind} size={15} />
        </span>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((now) => !now)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left text-muted transition-colors duration-fast ease hover:text-ink"
        >
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">{name}</span>
            <span className="truncate text-sm font-medium text-ink">{SUMMARY[kind](record)}</span>
          </span>
          {open ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </button>
        {latest && (
          <button
            type="button"
            aria-pressed={targeted}
            onClick={() => onTarget(kind)}
            className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors duration-fast ease ${
              targeted ? 'border-primary bg-primary text-on-primary' : 'border-primary/30 text-primary hover:bg-primary/10'
            }`}
          >
            Change this
          </button>
        )}
      </div>
      {open && (
        <div className="border-t border-line bg-panel px-3 py-3">
          <Body record={record} providers={providers ?? []} onOpenBuilder={() => onOpenBuilder(record.result)} />
        </div>
      )}
    </section>
  );
}
