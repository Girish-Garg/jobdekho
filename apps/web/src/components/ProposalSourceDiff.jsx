import { useMemo } from 'react';
import { useProposalBase } from '../lib/useProposalBase.js';
import { diffLines, changeCount } from '../lib/lineDiff.js';
import { foldUnchanged } from '../lib/foldDiff.js';
import DiffLines from './DiffLines.jsx';

// The proposal's source against the version it was written from, loaded
// only once "View changes" is opened: most cards are applied or discarded
// on their summary alone, and each one would otherwise read the document.
export default function ProposalSourceDiff({ proposal }) {
  const base = useProposalBase(proposal);
  const ops = useMemo(() => diffLines(base.tex, proposal.tex), [base.tex, proposal.tex]);

  if (base.state === 'loading') return <p className="text-xs text-muted">Reading the version it was written from...</p>;

  const { added, removed } = changeCount(ops);
  return (
    <div className="flex flex-col gap-1.5">
      <p className="flex items-center gap-2 text-xs text-muted">
        <span className="tnum font-semibold text-applied">+{added}</span>
        <span className="tnum font-semibold text-ember">-{removed}</span>
        <span>{base.state === 'gone' ? 'lines. The document it changes was deleted since.' : 'lines'}</span>
      </p>
      <DiffLines ops={foldUnchanged(ops)} />
    </div>
  );
}
