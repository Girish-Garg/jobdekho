// The actions one answer offered, each a button naming in words what it will
// do. Clicking it is the only thing that ever changes the feed - the answer
// itself never does, whatever it claimed.
export default function ChatActions({ actions, onApply }) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onApply(action)}
          className="rounded-md border border-line px-2.5 py-1 text-xs text-ink transition-colors duration-fast ease hover:border-edge"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
