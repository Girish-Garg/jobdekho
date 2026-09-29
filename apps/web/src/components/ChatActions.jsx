// The actions one answer offered, each a button naming in words what it will
// do. Clicking it is the only thing that ever changes the feed - the answer
// itself never does, whatever it claimed. Saffron, because these are the
// things in an answer that act.
export default function ChatActions({ actions, onApply }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.map((action, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onApply(action)}
          className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary transition-colors duration-fast ease hover:border-primary/60 hover:bg-primary/10"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
