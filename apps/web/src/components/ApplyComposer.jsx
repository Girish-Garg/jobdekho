import ChatInput from './ChatInput.jsx';

// The three things worth asking on almost every form, one press each, over
// the box for anything else.
const ASKS = [
  ['Draft from my resume', 'Draft answers for the questions left on this page that my resume can answer, and ask me about the rest.'],
  ["What's left?", "Which questions on this page are left for me? Don't fill anything yet."],
  ['Check my answers', "Check the answers on this page against my profile and resume, and tell me anything that looks wrong. Don't change anything."],
];

// The foot of the assistant (ApplyAssistant.jsx). `draft` is a reply started
// from a question that needs the person ('For "Notice period": ').
export default function ApplyComposer({ chat, draft, disabled = false }) {
  const busy = Boolean(chat.pending);
  return (
    <div className="flex flex-col gap-2 border-t border-line p-3">
      <div className="flex flex-wrap gap-1.5">
        {ASKS.map(([label, text]) => (
          <button
            key={label}
            type="button"
            disabled={busy || disabled}
            onClick={() => chat.ask(text)}
            className="rounded-full border border-line px-2.5 py-1 text-xs font-medium text-ink transition-colors duration-fast ease hover:border-edge hover:bg-select disabled:cursor-not-allowed disabled:opacity-50"
          >
            {label}
          </button>
        ))}
      </div>
      <ChatInput busy={busy || disabled} onSend={chat.ask} onStop={busy ? chat.stop : null} placeholder="Tell it what to put..." submitLabel="Send" draft={draft} />
    </div>
  );
}
