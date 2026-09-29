import { useState } from 'react';
import GuardProblems from './GuardProblems.jsx';
import ProposalSourceDiff from './ProposalSourceDiff.jsx';
import { ChevronDownIcon, ChevronUpIcon, DocumentIcon, MailIcon, WarningIcon } from './Icon.jsx';

// A document proposal's body: which document it rewrites (or the new one it
// makes), what the guard refused (which blocks Apply), what it claims that
// the profile does not say (which only asks for a look), and the source
// changes on demand. The claims are a quiet line, not an alarm: the check
// is a heuristic, and a reworded bullet often trips it harmlessly.
function FactFlags({ flags }) {
  return (
    <div className="flex items-start gap-2 text-xs leading-relaxed text-muted">
      <WarningIcon size={13} className="mt-0.5 text-ember/80" />
      <p className="min-w-0 flex-1">
        <span className="font-semibold text-ink">Not in your profile: </span>
        {flags.map((flag) => (
          <span key={flag} className="mb-1 mr-1 inline-block rounded-full border border-line bg-paper px-2 py-px font-medium text-ink">{flag}</span>
        ))}
        <span className="block">Check these are true before you apply it.</span>
      </p>
    </div>
  );
}

export default function DocumentProposalBody({ proposal }) {
  const [open, setOpen] = useState(false);
  const letter = proposal.documentKind === 'cover-letter';
  const Mark = letter ? MailIcon : DocumentIcon;
  const target = proposal.documentId ? proposal.name : `New ${letter ? 'cover letter' : 'resume'}: ${proposal.name}`;

  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-center gap-2 text-sm font-medium text-ink">
        <Mark size={14} className="text-muted" />
        <span className="min-w-0 truncate" title={target}>{target}</span>
      </p>
      {proposal.problems.length > 0 && (
        <GuardProblems title="JobDekho will not compile this version, so it cannot be applied. Ask the chat to fix:" problems={proposal.problems} />
      )}
      {proposal.factFlags.length > 0 && <FactFlags flags={proposal.factFlags} />}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((now) => !now)}
        className="inline-flex items-center gap-1.5 self-start rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink transition-colors duration-fast ease hover:border-edge"
      >
        {open ? 'Hide changes' : 'View changes'}
        {open ? <ChevronUpIcon size={12} /> : <ChevronDownIcon size={12} />}
      </button>
      {open && <ProposalSourceDiff proposal={proposal} />}
    </div>
  );
}
