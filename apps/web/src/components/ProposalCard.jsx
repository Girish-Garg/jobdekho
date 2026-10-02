import { useProposal } from '../lib/useProposal.js';
import Card from './ui/Card.jsx';
import Chip from './ui/Chip.jsx';
import Eyebrow from './ui/Eyebrow.jsx';
import ProfileDiff from './ProfileDiff.jsx';
import DocumentProposalBody from './DocumentProposalBody.jsx';
import ProposalRefusal from './ProposalRefusal.jsx';
import ProposalFooter from './ProposalFooter.jsx';
import { CheckIcon, DocumentIcon, MailIcon, PenIcon } from './Icon.jsx';

// A change the chat offers, as a card with Apply on it: nothing in the
// answer ever changed the profile or a document, only this button does
// (see the server's chat/apply-proposal.js). Saffron while it waits, green
// once applied, greyed once discarded or when it could not be made at all;
// the status comes from the saved turn, so a reload shows each card as it
// was left.
const KIND = {
  profile: { word: 'Profile change', Icon: PenIcon },
  resume: { word: 'Resume change', Icon: DocumentIcon },
  'cover-letter': { word: 'Cover letter change', Icon: MailIcon },
};

const FRAME = {
  pending: 'border-primary/35 shadow-raise',
  applied: 'border-applied/40',
  discarded: 'opacity-70',
  refused: '',
};

const TILE = {
  pending: 'bg-primary/10 text-primary',
  applied: 'bg-applied/15 text-applied',
  discarded: 'bg-ink/5 text-muted',
  refused: 'bg-ink/5 text-muted',
};

// The greyed chip sits on the same wash as its tile, a shade darker than
// Chip's own quiet one, so the two read as one mark.
const CHIP = {
  pending: ['primary', 'Waiting for you'],
  applied: ['applied', 'Applied'],
  discarded: ['quiet', 'Discarded'],
  refused: ['quiet', 'Not made'],
};

function Body({ proposal, status }) {
  if (status === 'refused') return <ProposalRefusal reason={proposal.reason} />;
  return proposal.kind === 'profile' ? <ProfileDiff diff={proposal.diff} /> : <DocumentProposalBody proposal={proposal} />;
}

export default function ProposalCard({ proposal }) {
  const state = useProposal(proposal);
  const kind = KIND[proposal.kind === 'profile' ? 'profile' : proposal.documentKind];
  const Icon = state.status === 'applied' ? CheckIcon : kind.Icon;
  const [chipTone, chipWord] = CHIP[state.status];
  const blocked = proposal.kind === 'document' && proposal.problems.length > 0;

  return (
    <Card
      as="section"
      variant="list"
      aria-label={`${kind.word}: ${proposal.summary}`}
      data-status={state.status}
      className={`rounded-2xl bg-paper transition-opacity duration-slow ${FRAME[state.status]}`}
    >
      <div className="flex items-start gap-2.5 px-3.5 py-3">
        <span aria-hidden="true" className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${TILE[state.status]}`}>
          <Icon size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <Eyebrow primary={state.status === 'pending'}>{kind.word}</Eyebrow>
          <p className="text-sm font-semibold leading-snug text-ink">{proposal.summary}</p>
        </div>
        <Chip tone={chipTone} className={`shrink-0 ${chipTone === 'quiet' ? 'bg-ink/5' : ''}`}>{chipWord}</Chip>
      </div>
      <div className="border-t border-line bg-panel px-3.5 py-3">
        <Body proposal={proposal} status={state.status} />
      </div>
      <div className="border-t border-line px-3.5 py-2.5">
        <ProposalFooter state={state} blocked={blocked} />
      </div>
    </Card>
  );
}
