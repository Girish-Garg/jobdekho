import { PROFILE_DEGREE_OPTIONS } from '../lib/taxonomy.js';
import { Field } from './FilterField.jsx';
import TagInput from './TagInput.jsx';
import SaveBar from './SaveBar.jsx';

const BOX = 'rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink';

// Every field the extractor fills is editable here: extraction gets things
// wrong, and the profile drives the ranking, so hand edits are the primary
// path rather than a fallback.
export default function ProfileForm({ profile, onChange, onSave }) {
  const set = (key) => (value) => onChange({ ...profile, [key]: value });

  return (
    <div className="flex flex-col gap-5">
      <TagInput label="Skills" values={profile.skills} onChange={set('skills')} />
      <TagInput label="Target titles" values={profile.titles} onChange={set('titles')} />
      <TagInput label="Locations" values={profile.locations} onChange={set('locations')} />
      <div className="grid max-w-md grid-cols-2 gap-3">
        <Field label="Years of experience">
          <input
            type="number"
            min="0"
            max="50"
            value={profile.years ?? ''}
            // Blank means the profile does not say, which rules nothing out;
            // that is distinct from 0, which means fresher.
            onChange={(event) =>
              set('years')(event.target.value === '' ? null : Number(event.target.value))
            }
            className={BOX}
          />
        </Field>
        <Field label="Highest degree">
          <select value={profile.degree} onChange={(event) => set('degree')(event.target.value)} className={BOX}>
            {PROFILE_DEGREE_OPTIONS.map(([value, text]) => (
              <option key={value} value={value}>{text}</option>
            ))}
          </select>
        </Field>
      </div>
      <SaveBar onSave={onSave} label="Save profile" />
    </div>
  );
}
