import ChatActions from './ChatActions.jsx';
import ChatRefs from './ChatRefs.jsx';

// One question and its answer. Weight and size carry the difference between
// them - the question bold and dense, the answer regular and roomier -
// rather than a bubble or an avatar standing in for who said which. The jobs
// the answer named sit right under it, before any offer to change the feed,
// since reading on about one of them is the likelier next step.
export default function ChatTurn({ turn, onApply, onOpenRef }) {
  return (
    <div className="flex flex-col gap-2 py-3">
      <p className="text-sm font-semibold text-ink">{turn.question}</p>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/80">{turn.answer}</p>
      {turn.refs?.length > 0 && <ChatRefs refs={turn.refs} onOpen={onOpenRef} />}
      {turn.actions?.length > 0 && <ChatActions actions={turn.actions} onApply={onApply} />}
    </div>
  );
}
