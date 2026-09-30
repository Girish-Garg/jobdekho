import { useChatSession } from '../lib/chatSession.js';
import { SparkleIcon } from './Icon.jsx';

// The chat's switch in the top bar. With the panel closed it also says what
// the chat is doing out of sight, since an answer now arrives whether the
// panel is open or not (see lib/chatSession.js): a breathing dot while a
// question is being answered, a still one once an answer is waiting unread.
// The name stays "Ask AI"; the dot's meaning rides in the title.
export default function AskAiToggle({ open, onToggle }) {
  const { call, unseen } = useChatSession();
  const dot = open ? null : call ? 'working' : unseen ? 'waiting' : null;
  const title = { working: 'The AI is answering your question', waiting: 'A new answer is waiting in the chat' }[dot];

  return (
    <button
      type="button"
      onClick={onToggle}
      data-keeps-pane
      aria-pressed={Boolean(open)}
      title={title}
      className={`btn px-3.5 font-medium ${open ? 'btn-primary' : 'btn-tint'}`}
    >
      <SparkleIcon size={14} />
      Ask AI
      {dot && (
        <span
          aria-hidden="true"
          data-dot={dot}
          className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-panel bg-primary ${dot === 'working' ? 'breathe' : ''}`}
        />
      )}
    </button>
  );
}
