import { TextField } from './ProfileField.jsx';
import SmallFields from './SmallFields.jsx';

// The open entry's fields, rows that each run the panel's full width: the
// title, given twice the room since it is the longest, beside its
// organisation, then the small fields sharing one row in equal parts.
export default function EntryFields({ entry, meta, onChange }) {
  const set = (key) => (value) => onChange({ ...entry, [key]: value });
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
        <TextField label={meta.titleLabel} value={entry.title} onChange={set('title')} />
        <TextField label={meta.orgLabel} value={entry.organisation} onChange={set('organisation')} />
      </div>
      <SmallFields entry={entry} meta={meta} onChange={onChange} />
    </>
  );
}
