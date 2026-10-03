import { useChatStore } from '../lib/chatStore.js';
import Button from './ui/Button.jsx';
import { SparkleIcon } from './Icon.jsx';

// The chat's switch in the top bar. With the panel closed it also says what
// the chats are doing out of sight, since an answer arrives whether the
// panel is open or not (see lib/chatStore.js): a breathing dot while a call
// runs, a still one once an answer is waiting unseen in any chat. The name
// stays "Ask AI"; the dot's meaning rides in the title.
export default function AskAiToggle({ open, onToggle }) {
  const { busy, unseen, list } = useChatStore();
  const waiting = Object.keys(unseen).length > 0 || Boolean(list?.some((view) => view.unseen));
  const dot = open ? null : busy ? 'working' : waiting ? 'waiting' : null;
  const title = { working: 'The AI is answering in one of your chats', waiting: 'A new answer is waiting in the chat' }[dot];

  return (
    <Button
      variant={open ? 'primary' : 'tint'}
      onClick={onToggle}
      data-keeps-pane
      aria-pressed={Boolean(open)}
      title={title}
      className="px-3.5 font-medium"
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
    </Button>
  );
}
