import PostingActions from './PostingActions.jsx';
import PostingFacts from './PostingFacts.jsx';
import MatchReasons from './MatchReasons.jsx';
import GhostSignals from './GhostSignals.jsx';
import AiGate from './AiGate.jsx';
import AiSection from './AiSection.jsx';
import FakeCheck from './FakeCheck.jsx';

// Only one overlay is ever mounted, so a constant id is enough to name it.
export const TITLE_ID = 'posting-dialog-title';

// The read order is the decision order: what the job is, then why it fits,
// then what to doubt about it, then the description, then the AI actions,
// and only then the apply step. The facts strip sits right under the header
// rather than after the fit block, because "what the job is" is the title
// and company plus level, location and pay - not a fact worth making a
// person scroll past the score to reach.
export default function PostingDetail({ posting, onClose, onStatus }) {
  // The pane hands no onClose: there, a posting is replaced rather than
  // dismissed, and closing would leave an empty column.
  // A doubtful posting keeps its rank and its badge; what moves is the check.
  // The two rungs where the card already warns are the two where the person
  // is asking "is this real?", so the button sits with the evidence rather
  // than further down among the other AI actions.
  const doubtful = posting.legitimacy === 'low' || posting.legitimacy === 'suspicious';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h2 id={TITLE_ID} className="font-display text-2xl font-extrabold leading-tight tracking-tight">
            {posting.title}
          </h2>
          <p className="mt-1 text-sm text-muted">{posting.company}</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-muted transition-colors duration-fast ease hover:border-edge hover:text-ink"
          >
            &#215;
          </button>
        )}
      </div>

      <PostingFacts posting={posting} />

      {/* Whenever the server ranked the feed, whatever the sort. The card
          stays a scan unit; the room for "why" is here. */}
      <MatchReasons reasons={posting.reasons} grade={posting.grade} breakdown={posting.breakdown} />

      {/* Ranked or not: legitimacy is about the posting, not the profile. This
          list is what the card's warning rests on - shown whenever there is
          evidence, even when it stayed below the warning's threshold. */}
      <GhostSignals signals={posting.ghostSignals}>
        {doubtful && (
          <AiGate intro={FakeCheck.intro} posting={posting} actions={[FakeCheck]} />
        )}
      </GhostSignals>

      {posting.descriptionSnippet && (
        <p className="text-sm leading-relaxed text-ink/80">{posting.descriptionSnippet}</p>
      )}

      <AiSection posting={posting} skip={doubtful ? [FakeCheck] : []} />

      {/* Sticky rather than merely last: the apply step is the point of the
          screen, so it stays reachable without scrolling past everything
          above, inside whichever ancestor is actually doing the scrolling
          (the dialog's backdrop, or the wide pane's own overflow). */}
      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-panel pt-4">
        <PostingActions
          status={posting.status}
          onStatus={(value) => onStatus(posting.id, posting.status === value ? null : value)}
        />
        <a
          href={posting.url}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper transition hover:opacity-85"
        >
          Open posting
        </a>
      </div>
    </div>
  );
}
