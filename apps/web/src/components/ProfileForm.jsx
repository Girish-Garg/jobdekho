import { PROFILE_DEGREE_OPTIONS } from '../lib/taxonomy.js';
import { sectionId } from '../lib/profileIndex.js';
import ProfileSection from './ProfileSection.jsx';
import { BOX, Labelled } from './ProfileField.jsx';
import Select from './Select.jsx';
import TagInput from './TagInput.jsx';
import { TargetIcon } from './Icon.jsx';

const HINT = 'What the recommendations on Postings score against. Skills from the groups above fold in here when you save.';

// Every field the extractor fills is editable here: extraction gets things
// wrong, and the profile drives the ranking, so hand edits are the primary
// path rather than a fallback. The save is the sticky bar the page shows
// whenever anything is unsaved (see ProfileSaveBar.jsx), so the whole record,
// entries included, still goes up in one write.
//
// The card's whole width: skills are the longest list and wrap into fewer
// rows across it, and the titles and the places sit side by side on a wide
// screen, where one narrow column left half the card empty.
export default function ProfileForm({ profile, onChange }) {
  const set = (key) => (value) => onChange({ ...profile, [key]: value });

  return (
    <ProfileSection id={sectionId('fit')} title="Best fit" icon={TargetIcon} hint={HINT}>
      <div className="flex flex-col gap-4">
        <TagInput plain label="Skills" values={profile.skills} onChange={set('skills')} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TagInput plain label="Target titles" values={profile.titles} onChange={set('titles')} />
          <TagInput plain label="Locations" values={profile.locations} onChange={set('locations')} />
        </div>
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
    </ProfileSection>
  );
}
