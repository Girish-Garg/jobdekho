import { useFocusTrap } from '../lib/useFocusTrap.js';
import { CloseIcon } from './Icon.jsx';

const GLOBAL = [
  ['Ctrl K / Cmd K', 'Open the command palette'],
  ['/', 'Focus the search box'],
  ['?', 'Show this help'],
];

// The feed agent owns and binds these keys; this file only documents them so
// the two lists cannot drift apart from a single place a person can read.
const FEED = [
  ['j / k', 'Move to the next or previous posting'],
  ['Enter', 'Open the selected posting'],
  ['s', 'Mark saved'],
  ['a', 'Mark applied'],
  ['d', 'Dismiss'],
  ['u', 'Undo the last status change'],
  ['Escape', 'Clear the selection'],
];

const TITLE_ID = 'shortcuts-help-title';

export default function ShortcutsHelp({ open, onClose }) {
  const trapRef = useFocusTrap(open);
  if (!open) return null;

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40" onMouseDown={onClose}>
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
        className="pop-in w-full max-w-md rounded-lg border border-line bg-overlay p-5 shadow-pop"
      >
        <div className="flex items-center justify-between">
          <h2 id={TITLE_ID} className="text-md font-semibold text-ink">Keyboard shortcuts</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-6 w-6 place-items-center text-muted transition hover:text-ink">
            <CloseIcon />
          </button>
        </div>
        <ShortcutGroup title="Global" rows={GLOBAL} />
        <ShortcutGroup title="On the feed" rows={FEED} />
      </div>
    </div>
  );
}

function ShortcutGroup({ title, rows }) {
  return (
    <div className="mt-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{title}</p>
      <dl className="mt-2 space-y-1.5">
        {rows.map(([key, text]) => (
          <div key={key} className="flex items-center justify-between gap-4 text-sm">
            <dt className="rounded border border-line bg-paper px-1.5 py-0.5 font-mono text-xs text-ink">{key}</dt>
            <dd className="flex-1 text-right text-muted">{text}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
