import { itemName } from '../lib/chatNames.js';
import Chip from './ui/Chip.jsx';
import IconButton from './ui/IconButton.jsx';
import { ItemTile } from './AddItemList.jsx';
import ChatItemMenu from './ChatItemMenu.jsx';
import { CloseIcon } from './Icon.jsx';

// One job or document the chat holds, named where the conversation starts
// so a question is never ambiguous about which one. Its name opens it: a job
// in the pane, a document on the Resume page; a job in a comparison or a
// document's chat opens a menu with its actions as well (`menu`, see
// ChatItemMenu.jsx). The x takes it out of the chat. The chat's own job or
// document (`home`) is only left out: the chat stays its own, and the chip
// turns into a dotted pill that adds it back (see ChatItems.jsx). One
// JobDekho no longer has stays, greyed and saying so.
export default function ChatItemChip({ type, item, home, onOpen, onRemove, menu = null }) {
  const name = itemName(type, item);
  const gone = type === 'job' ? item.listed === false : item.exists === false;
  const out = home ? { label: `Leave ${name} out of this chat`, title: 'Leave it out: answers stop reading it' } : { label: `Take ${name} out of this chat`, title: 'Take it out of this chat' };

  return (
    <Chip as="li" tone={gone ? 'quiet' : 'primary'} className={`max-w-full gap-1.5 border py-0.5 pl-1 pr-0.5 text-ink ${gone ? 'border-line' : 'border-primary/30'}`}>
      <ItemTile type={type} item={item} small />
      {menu ? (
        <ChatItemMenu name={name} job={item} onOpenJob={onOpen} {...menu} />
      ) : (
        <button type="button" onClick={onOpen} title={name} className="min-w-0 truncate text-left">
          {name}
        </button>
      )}
      {gone && <span className="shrink-0 font-normal text-muted">{type === 'job' ? 'no longer listed' : 'deleted'}</span>}
      <IconButton size="xs" label={out.label} title={out.title} onClick={onRemove} className="text-muted hover:bg-primary/15">
        <CloseIcon size={10} />
      </IconButton>
    </Chip>
  );
}
