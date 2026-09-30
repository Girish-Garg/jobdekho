import { useProposal } from '../lib/useProposal.js';
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
  discarded: 'border-line opacity-70',
  refused: 'border-line',
};

const TILE = {
  pending: 'bg-primary/10 text-primary',
  applied: 'bg-applied/15 text-applied',
  discarded: 'bg-ink/5 text-muted',
  refused: 'bg-ink/5 text-muted',
};

const CHIP = {
  pending: ['bg-primary/10 text-primary', 'Waiting for you'],
  applied: ['bg-applied/15 text-applied', 'Applied'],
  discarded: ['bg-ink/5 text-muted', 'Discarded'],
  refused: ['bg-ink/5 text-muted', 'Not made'],
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
    <section aria-label={`${kind.word}: ${proposal.summary}`} data-status={state.status} className={`overflow-hidden rounded-2xl border bg-paper transition-opacity duration-slow ease ${FRAME[state.status]}`}>
      <div className="flex items-start gap-2.5 px-3.5 py-3">
        <span aria-hidden="true" className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${TILE[state.status]}`}>
          <Icon size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${state.status === 'pending' ? 'text-primary' : 'text-muted'}`}>{kind.word}</p>
          <p className="text-sm font-semibold leading-snug text-ink">{proposal.summary}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${chipTone}`}>{chipWord}</span>
      </div>
      <div className="border-t border-line bg-panel px-3.5 py-3">
        <Body proposal={proposal} status={state.status} />
      </div>
      <div className="border-t border-line px-3.5 py-2.5">
        <ProposalFooter state={state} blocked={blocked} />
      </div>
    </section>
  );
}
