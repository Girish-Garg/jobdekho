import ChatActions from './ChatActions.jsx';
import ChatRefs from './ChatRefs.jsx';
import ChatSources from './ChatSources.jsx';

// One question and its answer. Weight and size carry the difference between
// them - the question bold and dense, the answer regular and roomier -
// rather than a bubble or an avatar standing in for who said which. The jobs
// the answer named sit right under it, before any offer to change the feed,
// since reading on about one of them is the likelier next step.
//
// An answer from a web search says so above it, and says what went out: the
// question and the job's public details, never the profile (see the server's
// chat/web-prompt.js). A search that failed left the answer from the
// person's own data standing, and says why under it.
export default function ChatTurn({ turn, onApply, onOpenRef }) {
  return (
    <div className="flex flex-col gap-2 py-3">
      <p className="text-sm font-semibold text-ink">{turn.question}</p>
      {turn.web && (
        <p className="text-xs font-medium text-accent">
          Searched the web with your question and the job&apos;s public details, not your profile.
        </p>
      )}
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/80">{turn.answer}</p>
      {turn.sources?.length > 0 && <ChatSources sources={turn.sources} />}
      {turn.webError && (
        <p className="text-xs text-muted">Answered from your own data. The web search did not work: {turn.webError}</p>
      )}
      {turn.refs?.length > 0 && <ChatRefs refs={turn.refs} onOpen={onOpenRef} />}
      {turn.actions?.length > 0 && <ChatActions actions={turn.actions} onApply={onApply} />}
    </div>
  );
}
