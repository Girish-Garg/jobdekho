import { BookmarkIcon, CheckIcon, CloseIcon } from './Icon.jsx';

// The three status buttons of a row, as icons named for screen readers and
// tooltips, in the colours the pane's footer uses for the same statuses; and
// the undo that replaces them for a few seconds after a dismiss. They share
// the row's trailing column with the fit meter rather than owning one: a
// column of buttons empty on every row but the hovered one cost the title.
const ACTIONS = [
  ['saved', 'Save', BookmarkIcon, 'border-accent/40 bg-accent/10 text-accent'],
  ['applied', 'Applied', CheckIcon, 'border-applied/40 bg-applied/10 text-applied'],
  ['dismissed', 'Dismiss', CloseIcon, 'border-edge bg-select text-ink'],
];

export default function RowActions({ posting, flashUndo, onStatus, onUndo }) {
  if (flashUndo) {
    return (
      <span className="text-xs text-muted">
        Dismissed.{' '}
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); onUndo(); }}
          className="font-medium text-ink underline underline-offset-2"
        >
          Undo
        </button>
      </span>
    );
  }
  return (
    <span className="flex gap-1">
      {ACTIONS.map(([value, label, Icon, pressed]) => {
        const on = posting.status === value;
        return (
          <button
            key={value}
            type="button"
            aria-label={label}
            title={label}
            aria-pressed={on}
            onClick={(event) => { event.stopPropagation(); onStatus(posting.id, value); }}
            className={`grid h-7 w-7 place-items-center rounded-full border transition-colors duration-fast ease ${
              on ? pressed : 'border-line bg-panel text-muted hover:border-edge hover:text-ink'
            }`}
          >
            <Icon size={13} />
          </button>
        );
      })}
    </span>
  );
}
