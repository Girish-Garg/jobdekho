import ChatAvatar from './ChatAvatar.jsx';

// The AI's side of a turn: its mark and the name of the CLI that answered on
// one line, then the answer at full width below. No bubble around it: an
// answer carries lists, job cards and sources, and a bubble around all of
// that only narrows it. It rises in, since it is the part that just arrived.
export default function ChatAssistant({ name, when, children }) {
  return (
    <div className="rise flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <ChatAvatar />
        <span className="text-xs font-semibold text-ink">{name}</span>
        {when && <span className="text-xs text-muted">{when}</span>}
      </div>
      {children}
    </div>
  );
}
