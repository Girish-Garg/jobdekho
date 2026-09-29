import ChatBubble from './ChatBubble.jsx';
import ChatAssistant from './ChatAssistant.jsx';

// The call in flight: what was asked, at once, so the person sees it went,
// then the AI's row with three dots and the progress line under them. The
// line is what says anything (who is answering, for how long, that it went
// to the web); the dots only say "still going", and stand still for anyone
// who asked for less motion.
export default function ChatPending({ pending, progress, name }) {
  return (
    <div className="flex flex-col gap-4">
      <ChatBubble rise note={pending.changing ? `Changing: ${pending.changing}` : null}>{pending.say}</ChatBubble>
      <ChatAssistant name={name}>
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-3 py-2.5">
            <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          <p aria-live="polite" className="min-w-0 text-xs text-muted">{progress}</p>
        </div>
      </ChatAssistant>
    </div>
  );
}
