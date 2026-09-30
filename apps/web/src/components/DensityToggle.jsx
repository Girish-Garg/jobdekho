import { RowsIcon, CardsIcon } from './Icon.jsx';
import SlidingPill from './SlidingPill.jsx';
import { useSlidingPill } from '../lib/useSlidingPill.js';

const MODES = [
  ['list', 'Rows', RowsIcon],
  ['grid', 'Cards', CardsIcon],
];

// A two-way switch, not a cycling button: the choice is binary, so showing
// both options beats hiding the one not picked behind repeat clicks. The
// picked side is lit by one pill that glides across (see useSlidingPill.js).
export default function DensityToggle({ mode, setMode }) {
  const pill = useSlidingPill(mode);
  return (
    <div ref={pill.ref} className="relative flex shrink-0 rounded-full border border-line bg-panel p-0.5 text-sm text-muted">
      <SlidingPill style={pill.style} glides={pill.glides} />
      {MODES.map(([value, label, Icon]) => (
        <button
          key={value}
          type="button"
          aria-pressed={mode === value}
          data-pill-key={value}
          onClick={() => setMode(value)}
          className={`relative inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors duration-fast ease ${
            mode === value ? 'font-medium text-ink' : 'hover:text-ink'
          }`}
        >
          <Icon size={13} />
          {label}
        </button>
      ))}
    </div>
  );
}
