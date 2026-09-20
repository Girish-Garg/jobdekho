import ChatActions from './ChatActions.jsx';

// One question and its answer. Weight and size carry the difference between
// them - the question bold and dense, the answer regular and roomier -
// rather than a bubble or an avatar standing in for who said which.
export default function ChatTurn({ turn, onApply }) {
  return (
    <div className="flex flex-col gap-2 py-3 first:pt-0">
      <p className="text-sm font-semibold text-ink">{turn.question}</p>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/80">{turn.answer}</p>
      {turn.actions?.length > 0 && <ChatActions actions={turn.actions} onApply={onApply} />}
    </div>
  );
}
