import { PROFILE_DEGREE_OPTIONS } from '../lib/taxonomy.js';
import { sectionId } from '../lib/profileIndex.js';
import ProfileSection from './ProfileSection.jsx';
import { BOX, Labelled } from './ProfileField.jsx';
import Select from './Select.jsx';
import TagInput from './TagInput.jsx';
import SaveBar from './SaveBar.jsx';

const HINT = 'What Best fit on Postings scores against. Skills from the groups above fold in here when you save.';

// Every field the extractor fills is editable here: extraction gets things
// wrong, and the profile drives the ranking, so hand edits are the primary
// path rather than a fallback. The save sits at the end of the record, so
// the whole of it, entries included, goes up in one write.
export default function ProfileForm({ profile, onChange, onSave }) {
  const set = (key) => (value) => onChange({ ...profile, [key]: value });

  return (
    <ProfileSection id={sectionId('fit')} title="Best fit" hint={HINT}>
      <div className="flex max-w-2xl flex-col gap-4">
        <TagInput plain label="Skills" values={profile.skills} onChange={set('skills')} />
        <TagInput plain label="Target titles" values={profile.titles} onChange={set('titles')} />
        <TagInput plain label="Locations" values={profile.locations} onChange={set('locations')} />
        <div className="grid max-w-md grid-cols-2 gap-x-6 gap-y-3">
          <Labelled label="Years of experience">
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
          </Labelled>
          <Labelled label="Highest degree">
            <Select block value={profile.degree} onChange={(event) => set('degree')(event.target.value)} className={BOX}>
              {PROFILE_DEGREE_OPTIONS.map(([value, text]) => (
                <option key={value} value={value}>{text}</option>
              ))}
            </Select>
          </Labelled>
        </div>
      </div>
      <SaveBar onSave={onSave} label="Save profile" />
    </ProfileSection>
  );
}
