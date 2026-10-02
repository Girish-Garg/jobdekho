import PostingPaneHeader from './PostingPaneHeader.jsx';
import PostingFacts from './PostingFacts.jsx';
import StaleNote from './StaleNote.jsx';
import MatchReasons from './MatchReasons.jsx';
import GhostSignals from './GhostSignals.jsx';
import AskAiButton from './AskAiButton.jsx';
import PostingDescription from './PostingDescription.jsx';
import PostingFooter from './PostingFooter.jsx';
import { isDoubtful } from '../lib/chatActionKinds.js';

export { TITLE_ID } from '../lib/postingTitle.js';

// The read order is the decision order: what the job is (the header and the
// facts), why it fits, what to doubt about it, what to do next, and then the
// description. The AI card comes before the description rather than after
// it: a body runs to 4000 characters, and the next step used to sit a few
// screens down under it.
//
// No AI runs here. The AI card hands the job to the chat panel (see
// AskAiButton.jsx), so there is a single place AI happens rather than a
// second copy of it in every pane. `onAsked` is the dialog's close, passed so
// the chat is not left hidden behind it.
//
// The header and the footer sit outside the middle's scroll, so the job's
// name and the apply step never scroll away in the pane; in the dialog, which
// scrolls as a whole, the footer is sticky instead (see PostingFooter.jsx).
export default function PostingDetail({ posting, onClose, onStatus, onAsked, onCompany, onBlock }) {
  // A doubtful posting keeps its rank and its badge; what moves is the
  // control. Where the card already warns, the person is asking "is this
  // real?", so it sits with the evidence.
  const withEvidence = isDoubtful(posting) && posting.ghostSignals?.length > 0;
  const ask = <AskAiButton posting={posting} onAsked={onAsked} />;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PostingPaneHeader posting={posting} onClose={onClose} onCompany={onCompany} onBlock={onBlock} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 px-5 py-4">
          <PostingFacts posting={posting} />
          <StaleNote posting={posting} />
          <MatchReasons fit={posting.fit} reasons={posting.reasons} grade={posting.grade} breakdown={posting.breakdown} why={posting.why} gates={posting.gates} />
          <GhostSignals signals={posting.ghostSignals}>{withEvidence && ask}</GhostSignals>
          {!withEvidence && ask}
          <PostingDescription key={posting.id} posting={posting} />
        </div>
      </div>
      <PostingFooter posting={posting} onStatus={onStatus} />
    </div>
  );
}
