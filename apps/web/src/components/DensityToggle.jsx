const MODE_LABEL = { list: 'Rows', grid: 'Cards' };

// A two-way switch, not a cycling button: the choice is binary, so showing
// both options beats hiding the one not picked behind repeat clicks.
export default function DensityToggle({ mode, setMode }) {
  return (
    <div className="flex shrink-0 rounded-full border border-line p-0.5 font-mono text-[11px] text-muted">
      {Object.entries(MODE_LABEL).map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={mode === value}
          onClick={() => setMode(value)}
          className={`rounded-full px-2.5 py-1 transition ${
            mode === value ? 'bg-ink text-paper' : 'hover:text-ink'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
