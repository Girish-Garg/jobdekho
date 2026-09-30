// Pill row shared by the single-select Status filter and the multi-select Level
// filter; the caller decides whether a pick toggles or replaces.
// Saffron, the colour of what you act with, rather than solid ink, which
// read as a heavier black block than anything else on the page.
const primaryTone = (value, selected) =>
  selected ? 'border-primary bg-primary text-on-primary font-semibold' : 'border-line bg-panel text-ink/80 hover:border-primary/40 hover:text-ink';

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
