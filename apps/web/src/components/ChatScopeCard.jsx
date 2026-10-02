import Card from './ui/Card.jsx';
import Eyebrow from './ui/Eyebrow.jsx';
import IconButton from './ui/IconButton.jsx';
import ChatMonogram from './ChatMonogram.jsx';
import { CloseIcon } from './Icon.jsx';

// The job the conversation is about, named where the conversation starts, so
// "is this real?" or "write me a letter" is never ambiguous about which one.
// Clearing it turns the chat back into questions about the feed as a whole.
export default function ChatScopeCard({ posting, onClear }) {
  return (
    <div className="shrink-0 border-b border-line px-3 py-2.5">
      <Card variant="inset" className="flex items-center gap-3 bg-paper py-2 pl-2 pr-1.5">
        <ChatMonogram name={posting.company} />
        <div className="min-w-0 flex-1">
          <Eyebrow primary>Asking about</Eyebrow>
          <p className="truncate text-sm font-semibold text-ink" title={posting.title}>{posting.title}</p>
          <p className="truncate text-xs text-muted">{posting.company}</p>
        </div>
        <IconButton label="Stop asking about this job" title="Stop asking about this job" square onClick={onClear}>
          <CloseIcon />
        </IconButton>
      </Card>
    </div>
  );
}
