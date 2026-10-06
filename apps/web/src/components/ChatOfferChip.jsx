import { ItemTile } from './AddItemList.jsx';
import { PlusIcon } from './Icon.jsx';

// A job or a document the chat could take, drawn dotted with a plus (see
// lib/chatHolds.js): one click adds it, with no picker to search. The
// chat's own job or document, while the person has left it out, is drawn
// the same way, and the click puts it back. `label` says what the click
// does, for the tooltip and a screen reader.
export default function ChatOfferChip({ type, item, name, label, onAdd }) {
  return (
    <li className="flex max-w-[14rem]">
      <button
        type="button"
        onClick={onAdd}
        title={label}
        aria-label={label}
        className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-dotted border-edge py-[3px] pl-1.5 pr-2.5 text-xs font-semibold text-muted transition-colors duration-fast ease hover:border-primary/50 hover:bg-primary/5 hover:text-ink"
      >
        <PlusIcon size={10} className="shrink-0" />
        <ItemTile type={type} item={item} small />
        <span className="min-w-0 truncate">{name}</span>
      </button>
    </li>
  );
}
