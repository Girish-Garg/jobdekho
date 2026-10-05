import { BookmarkIcon, CheckIcon, CloseIcon } from './Icon.jsx';
import IconButton from './ui/IconButton.jsx';

// The three status buttons of a row, as icons named for screen readers and
// tooltips, in the colours the pane's footer uses for the same statuses; and
// the undo that replaces them for a few seconds after a dismiss. They share
// the row's trailing column with the fit meter rather than owning one: a
// column of buttons empty on every row but the hovered one cost the title.
const ACTIONS = [
  ['saved', 'Save', BookmarkIcon, 'border-primary/40 bg-primary/10 text-primary'],
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
          onClick={(event) => { event.stopPropagation(); onUndo(posting.id); }}
          className="link"
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
          <IconButton
            key={value}
            label={label}
            title={label}
            outline
            aria-pressed={on}
            onClick={(event) => { event.stopPropagation(); onStatus(posting.id, value); }}
            className={on ? pressed : ''}
          >
            <Icon size={13} />
          </IconButton>
        );
      })}
    </span>
  );
}
