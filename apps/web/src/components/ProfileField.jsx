import TextInput from './ui/TextInput.jsx';

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
