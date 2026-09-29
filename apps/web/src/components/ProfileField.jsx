// The one input style the record uses: a panel-coloured well on the paper
// page, so a field reads as a field without a caption shouting at it.
export const BOX = 'rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink outline-none transition duration-fast ease-ease hover:border-edge focus:border-primary/60 focus:ring-2 focus:ring-primary/15';

// A plain caption, as a real <label>, above whatever control it names.
export function Labelled({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-muted">{label}</span>
      {children}
    </label>
  );
}

export function TextField({ label, value, onChange, placeholder }) {
  return (
    <Labelled label={label}>
      <input className={BOX} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </Labelled>
  );
}
