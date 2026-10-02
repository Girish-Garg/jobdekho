import Card from './ui/Card.jsx';
import IconButton from './ui/IconButton.jsx';
import { CloseIcon } from './Icon.jsx';

// A question written while an answer was on its way, held above the box
// until that answer is in (see ChatInput.jsx), with a way to take it back.
export default function ChatQueued({ text, onRemove }) {
  return (
    <Card as="p" variant="inset" className="flex items-center gap-2 bg-select/60 px-3 py-1.5 text-xs text-muted">
      <span className="min-w-0 flex-1 truncate">
        Sends once this answer is in: <span className="text-ink">{text}</span>
      </span>
      <IconButton label="Do not send it" title="Do not send it" size="xs" onClick={onRemove} className="h-6 w-6">
        <CloseIcon size={11} />
      </IconButton>
    </Card>
  );
}
