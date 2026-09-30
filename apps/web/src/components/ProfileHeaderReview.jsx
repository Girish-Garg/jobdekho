import { useMemo } from 'react';
import { diffLines } from '../lib/lineDiff.js';
import { foldUnchanged } from '../lib/foldDiff.js';
import DiffLines from './DiffLines.jsx';
import { CheckIcon } from './Icon.jsx';

const APPLY = 'btn btn-primary';
const CANCEL = 'btn btn-quiet text-muted hover:text-ink font-medium';

// The header change shown the way the chat's document cards show theirs
// (see ProposalSourceDiff.jsx): the line it replaces, then the line that
// replaces it, with the rest of the page folded away. Apply is saffron
// because it is the one control here that saves anything.
export default function ProfileHeaderReview({ before, after, busy, onApply, onCancel }) {
  const ops = useMemo(() => foldUnchanged(diffLines(before, after)), [before, after]);
  return (
    <div className="mt-3 flex flex-col gap-2.5">
      <DiffLines ops={ops} />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onApply} disabled={busy} className={APPLY}>
          <CheckIcon size={14} />
          {busy ? 'Applying...' : 'Apply'}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className={CANCEL}>Cancel</button>
        <span className="text-xs text-muted">Nothing changes until you apply.</span>
      </div>
    </div>
  );
}
