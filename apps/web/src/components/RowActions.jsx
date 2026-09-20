const ACTIONS = [
  ['saved', 'Save'],
  ['applied', 'Applied'],
  ['dismissed', 'Dismiss'],
];

// The three status buttons of a row, and the undo that replaces them for a
// few seconds after a dismiss. They share the row's trailing column with the
// fit meter rather than owning one: a column of buttons that is empty on
// every row but the hovered one cost 170px that the title needed more.
export default function RowActions({ posting, flashUndo, onStatus, onUndo }) {
  if (flashUndo) {
    return (
      <span className="text-xs text-muted">
        Dismissed.{' '}
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); onUndo(); }}
          className="text-ink underline underline-offset-2"
        >
          Undo
        </button>
      </span>
    );
  }
  return (
    <span className="flex gap-1">
      {ACTIONS.map(([value, label]) => {
        const on = posting.status === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={on}
            onClick={(event) => { event.stopPropagation(); onStatus(posting.id, value); }}
            className={`rounded-md border px-2 py-0.5 text-xs transition-colors duration-fast ease ${
              on ? 'border-ink bg-ink text-paper' : 'border-line bg-panel text-muted hover:border-edge hover:text-ink'
            }`}
          >
            {label}
          </button>
        );
      })}
    </span>
  );
}
