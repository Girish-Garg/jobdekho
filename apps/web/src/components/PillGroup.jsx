// Pill row shared by the single-select Status filter and the multi-select Level
// filter; the caller decides whether a pick toggles or replaces.
// The pick in a saffron tint, the same the active filter triggers wear: a
// solid saffron pill per group was the loudest thing in every menu.
const primaryTone = (value, selected) =>
  selected ? 'border-primary/40 bg-primary/10 text-primary font-semibold' : 'border-line bg-panel text-ink/80 hover:border-edge hover:text-ink';

export default function PillGroup({ options, selected, onPick }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={selected.includes(value)}
          onClick={() => onPick(value)}
          className={`rounded-full border px-3 py-1.5 text-[13px] transition-colors duration-fast ease ${primaryTone(value, selected.includes(value))}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
