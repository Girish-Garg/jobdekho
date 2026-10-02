import { useState } from 'react';
import Button from './ui/Button.jsx';
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

// How the change was made, beside its "View changes": a few targeted edits
// leave every other line as it was, while a rewrite of the whole document
// deserves the closer look. A new document is whole by nature.
function howMade({ documentId, editCount }) {
  if (!documentId) return '';
  if (!editCount) return 'Rewritten whole';
  return editCount === 1 ? '1 edit' : `${editCount} edits`;
}

export default function DocumentProposalBody({ proposal }) {
  const [open, setOpen] = useState(false);
  const letter = proposal.documentKind === 'cover-letter';
  const Mark = letter ? MailIcon : DocumentIcon;
  const target = proposal.documentId ? proposal.name : `New ${letter ? 'cover letter' : 'resume'}: ${proposal.name}`;
  const how = howMade(proposal);

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
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="quiet"
          size="sm"
          aria-expanded={open}
          onClick={() => setOpen((now) => !now)}
        >
          {open ? 'Hide changes' : 'View changes'}
          {open ? <ChevronUpIcon size={12} /> : <ChevronDownIcon size={12} />}
        </Button>
        {how && <span className="text-xs text-muted">{how}</span>}
      </div>
      {open && <ProposalSourceDiff proposal={proposal} />}
    </div>
  );
}
