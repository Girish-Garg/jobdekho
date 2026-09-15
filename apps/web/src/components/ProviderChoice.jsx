const AUTO = 'auto';

// Radio-style pick, same shape as ThemeChoice: "Whichever is available" plus
// one button per CLI the providers endpoint knows about, so a third CLI
// added later shows up here with no copy change.
export default function ProviderChoice({ providers, pref, onChange }) {
  return (
    <div role="radiogroup" aria-label="AI CLI" className="flex flex-wrap gap-1.5">
      <Option label="Whichever is available" active={!pref || pref === AUTO} onClick={() => onChange(AUTO)} />
      {providers.map((p) => (
        <Option key={p.id} label={p.label} active={pref === p.id} onClick={() => onChange(p.id)} />
      ))}
    </div>
  );
}

function Option({ label, active, onClick }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm transition-colors duration-fast ease ${
        active ? 'border-ink bg-ink text-paper' : 'border-line text-muted hover:border-edge hover:text-ink'
      }`}
    >
      {label}
    </button>
  );
}
