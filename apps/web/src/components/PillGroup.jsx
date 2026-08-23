// Pill row shared by the single-select Status filter and the multi-select Level
// filter; the caller decides whether a pick toggles or replaces.
const inkTone = (value, selected) =>
  selected ? 'border-ink bg-ink text-paper' : 'border-line text-muted hover:border-ink hover:text-ink';

// tone lets the Level row carry the same ramp the cards do, so the control and
// the data cannot drift apart.
export default function PillGroup({ options, selected, onPick, tone = inkTone }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={selected.includes(value)}
          onClick={() => onPick(value)}
          className={`rounded-full border px-3 py-1 text-xs transition ${tone(value, selected.includes(value))}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
