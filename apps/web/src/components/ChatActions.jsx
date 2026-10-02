import Button from './ui/Button.jsx';

// The actions one answer offered, each a button naming in words what it will
// do. Clicking it is the only thing that ever changes the feed - the answer
// itself never does, whatever it claimed. Saffron, because these are the
// things in an answer that act. A label is built from whatever filters the
// answer set ("Show mid and senior level, remote, grade B or better"), so it
// may be longer than the panel is wide and has to be allowed to wrap.
export default function ChatActions({ actions, onApply }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.map((action, i) => (
        <Button key={i} variant="tint" size="sm" onClick={() => onApply(action)} className="whitespace-normal bg-primary/5 hover:border-primary/60 hover:bg-primary/10">
          {action.label}
        </Button>
      ))}
    </div>
  );
}
