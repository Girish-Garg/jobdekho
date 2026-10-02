import { ArrowDownIcon, ArrowUpIcon, CopyIcon, PinIcon, TrashIcon } from './Icon.jsx';

const TEXT_BTN = 'inline-flex items-center gap-1 text-sm text-muted transition-colors duration-fast ease-ease hover:text-ink disabled:opacity-30 disabled:hover:text-muted';

// What acts on the entry as a whole, under a hairline: pin it and move it
// on the left, then at the far end copy it or remove it, the one that
// cannot be taken back sitting last.
export default function EntryFooter({ pinned, isFirst, isLast, onPin, onMove, onDuplicate, onRemove }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3">
      <button type="button" aria-pressed={pinned} onClick={onPin} className={`${TEXT_BTN} ${pinned ? 'text-primary hover:text-primary' : ''}`}>
        <PinIcon size={12} />
        {pinned ? 'Pinned' : 'Pin'}
      </button>
      <button type="button" disabled={isFirst} onClick={() => onMove(-1)} className={TEXT_BTN}>
        <ArrowUpIcon size={12} />
        Move up
      </button>
      <button type="button" disabled={isLast} onClick={() => onMove(1)} className={TEXT_BTN}>
        <ArrowDownIcon size={12} />
        Move down
      </button>
      <span className="ml-auto flex items-center gap-4">
        <button type="button" onClick={onDuplicate} className={TEXT_BTN}>
          <CopyIcon size={12} />
          Duplicate
        </button>
        <button type="button" onClick={onRemove} className={`${TEXT_BTN} hover:text-ember`}>
          <TrashIcon size={12} />
          Remove
        </button>
      </span>
    </div>
  );
}
