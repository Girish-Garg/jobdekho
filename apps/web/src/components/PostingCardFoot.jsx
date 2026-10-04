import { payText, payEvidence } from '../lib/payText.js';
import { ageText } from '../lib/postingNotes.js';
import TagChip from './TagChip.jsx';
import FitMeter from './FitMeter.jsx';
import RowActions from './RowActions.jsx';

// The foot of a card: the score on the left and the pay on the right. mt-auto
// only here: grid rows stretch to their tallest card, so this keeps the rule
// aligned across a row instead of floating. The quick actions take the
// score's place while the card is hovered, holds keyboard focus or is
// `pinned` (open in the pane, or just dismissed), as a row's do, so the pay
// beside them stays readable and its evidence one hover away. Up beside the
// company name they covered the New badge and the end of long names.
//
// Keyboard focus, not any focus: a pane closed with a click hands focus back
// to the card that opened it, and the actions stayed out on a job the person
// had just put away.
//
// Both sides sit above the card's stretched open button: the actions so a
// click on them saves or dismisses and never opens the job as well, the pay
// so it can be pointed at, with a press on it opening the job (`onOpen`).
export default function PostingCardFoot({ posting, pinned, onOpen, onStatus, onUndo, flashUndo }) {
  const pay = payText(posting);
  const age = ageText(posting);
  const ranked = Number.isInteger(posting.fit);

  return (
    <span className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3">
      <span className="relative flex min-h-7 min-w-0 items-center">
        <span className={`transition-opacity duration-fast ease ${onStatus ? (pinned ? 'invisible' : 'group-has-[:focus-visible]:opacity-0 group-hover:opacity-0') : ''}`}>
          {ranked ? <FitMeter fit={posting.fit} grade={posting.grade} breakdown={posting.breakdown} /> : <span className="text-xs text-muted">{age}</span>}
        </span>
        {onStatus && (
          <span
            className={`absolute inset-y-0 left-0 z-10 flex items-center transition duration-fast ease ${
              pinned ? '' : 'pointer-events-none translate-y-0.5 opacity-0 group-has-[:focus-visible]:pointer-events-auto group-has-[:focus-visible]:translate-y-0 group-has-[:focus-visible]:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100'
            }`}
          >
            <RowActions posting={posting} flashUndo={flashUndo} onStatus={onStatus} onUndo={onUndo} />
          </span>
        )}
      </span>
      <span className="relative z-10 flex min-w-0 justify-end" onClick={onOpen}>
        {pay ? (
          <TagChip as="span" align="end" hostClassName="min-w-0" evidence={payEvidence(posting)} className="tnum block truncate text-sm font-semibold text-ink">
            {pay}
          </TagChip>
        ) : <span className="text-xs text-muted">{ranked ? age : ''}</span>}
      </span>
    </span>
  );
}
