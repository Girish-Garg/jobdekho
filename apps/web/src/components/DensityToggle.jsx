import { RowsIcon, CardsIcon } from './Icon.jsx';

const MODES = [
  ['list', 'Rows', RowsIcon],
  ['grid', 'Cards', CardsIcon],
];

// A two-way switch, not a cycling button: the choice is binary, so showing
// both options beats hiding the one not picked behind repeat clicks.
export default function DensityToggle({ mode, setMode }) {
  return (
    <div className="flex shrink-0 rounded-full border border-line bg-panel p-0.5 text-sm text-muted">
      {MODES.map(([value, label, Icon]) => (
        <button
          key={value}
          type="button"
          aria-pressed={mode === value}
          onClick={() => setMode(value)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors duration-fast ease ${
            mode === value ? 'bg-select font-medium text-ink' : 'hover:text-ink'
          }`}
        >
          <Icon size={13} />
          {label}
        </button>
      ))}
    </div>
  );
}
