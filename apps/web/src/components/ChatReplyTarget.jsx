import Chip from './ui/Chip.jsx';
import IconButton from './ui/IconButton.jsx';
import { CloseIcon, PenIcon } from './Icon.jsx';

// Says, right where the next message is typed, that it will change a card
// rather than ask a question. Saffron like the ring on the card it names.
// Clearing it goes back to plain chat.
export default function ChatReplyTarget({ name, onClear }) {
  return (
    <div className="flex">
      <Chip as="p" tone="primary" className="max-w-full gap-1.5 border border-primary/30 pl-2.5 pr-0.5">
        <PenIcon size={12} />
        <span className="truncate">Changing: {name}</span>
        <IconButton
          size="xs"
          label="Stop changing it, back to plain chat"
          title="Back to plain chat"
          onClick={onClear}
          className="text-primary hover:bg-primary/15"
        >
          <CloseIcon size={11} />
        </IconButton>
      </Chip>
    </div>
  );
}
