import PostingPaneHeader from './PostingPaneHeader.jsx';
import PostingFacts from './PostingFacts.jsx';
import StaleNote from './StaleNote.jsx';
import FewDetailsNote from './FewDetailsNote.jsx';
import MatchReasons from './MatchReasons.jsx';
import CautionCard from './CautionCard.jsx';
import AskAiButton from './AskAiButton.jsx';
import PostingDescription from './PostingDescription.jsx';
import PostingFooter from './PostingFooter.jsx';
import { isDoubtful } from '../lib/chatActionKinds.js';
import { usePostingDetail } from '../lib/usePostingDetail.js';

export { TITLE_ID } from '../lib/postingTitle.js';

// The read order is the decision order: what the job is (the header and the
// facts), why it fits, what to doubt about it, what to do next, and then the
// description. The AI card comes before the description rather than after
// it: a body runs to thousands of characters, and the next step would sit a
// few screens down under it.
//
// The pane reads the posting whole (lib/usePostingDetail.js) over the feed's
// row: the same job with its full text, sections and facts, and after a
// fetched description, its new tags. The status stays the row's, which the
// feed changes the moment a button is pressed.
//
// No AI runs here. The AI card hands the job to the chat panel (see
// AskAiButton.jsx), so there is a single place AI happens rather than a
// second copy of it in every pane. `onAsked` is the dialog's close, passed so
// the chat is not left hidden behind it. `onOpenSettings` is the way to
// Settings when LinkedIn is switched off there.
//
// The header and the footer sit outside the middle's scroll, so the job's
// name and the apply step never scroll away in the pane; in the dialog, which
// scrolls as a whole, the footer is sticky instead (see PostingFooter.jsx).
export default function PostingDetail({ posting: row, onClose, onStatus, onAsked, onCompany, onBlock, onOpenSettings }) {
  const view = usePostingDetail(row.id);
  const posting = view.detail ? { ...row, ...view.detail, status: row.status } : row;
  // A posting that states a red flag keeps its rank and its chip; what moves
  // is the control. Where the Caution card names the flags, the person is
  // asking "is this real?", so that check sits with the evidence.
  const flagged = isDoubtful(posting);
  const ask = <AskAiButton posting={posting} onAsked={onAsked} />;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PostingPaneHeader posting={posting} onClose={onClose} onCompany={onCompany} onBlock={onBlock} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 px-5 py-4">
          <PostingFacts posting={posting} />
          <StaleNote posting={posting} />
          <FewDetailsNote posting={posting} />
          <MatchReasons fit={posting.fit} reasons={posting.reasons} grade={posting.grade} breakdown={posting.breakdown} why={posting.why} gates={posting.gates} />
          <CautionCard caution={posting.caution}>{flagged && ask}</CautionCard>
          {!flagged && ask}
          <PostingDescription key={posting.id} posting={posting} view={view} onOpenSettings={onOpenSettings} />
        </div>
      </div>
      <PostingFooter posting={posting} onStatus={onStatus} />
    </div>
  );
}
