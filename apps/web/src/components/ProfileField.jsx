// The one input style the record uses: a panel-coloured well on the paper
// page, so a field reads as a field without a caption shouting at it.
export const BOX = 'rounded-md border border-line bg-panel px-2.5 py-1.5 text-sm text-ink outline-none transition-colors duration-fast ease-ease focus:border-ink';

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
