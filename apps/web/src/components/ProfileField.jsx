import TextInput from './ui/TextInput.jsx';

// The `.field` look (fields.css) as a class string, for the controls that
// still spell their inputs out by hand. TextInput is how a field is made.
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

// `readOnly` shows a value the field cannot take typing for just now (an End
// a "Still going" switch holds at Present), in the quieter tone.
export function TextField({ label, value, onChange, placeholder, readOnly = false, inputRef }) {
  return (
    <Labelled label={label}>
      <TextInput
        ref={inputRef}
        className="read-only:text-muted"
        value={value}
        placeholder={placeholder}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
      />
    </Labelled>
  );
}
