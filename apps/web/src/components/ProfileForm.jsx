import { useId } from 'react';
import { PROFILE_DEGREE_OPTIONS } from '../lib/taxonomy.js';
import { sectionId } from '../lib/profileIndex.js';
import { MAX_SKILLS } from '../lib/groupSkills.js';
import GroupSkillSuggestions from './GroupSkillSuggestions.jsx';
import ProfileSection from './ProfileSection.jsx';
import FitField from './FitField.jsx';
import YearsField from './YearsField.jsx';
import PillGroup from './PillGroup.jsx';
import TagInput from './TagInput.jsx';
import { TargetIcon } from './Icon.jsx';

const HINT = 'What your recommendations are ranked by. JobDekho never changes it for you.';

// What each field does to the ranking, under its name (see core's score.js:
// a job's content is 60 parts skills to 40 parts title, and the gates in
// fit-gates.js lower one this person cannot take or would not want).
const SAYS = {
  skills: "The larger part of every score: how much of a job's stack you already know.",
  titles: 'A job named like one of these ranks higher.',
  locations: 'A job in another city ranks a little lower, one abroad much lower.',
  years: 'Jobs asking for far more years rank lower. Blank rules nothing out.',
  degree: 'Jobs that need a higher degree rank lower.',
};

// Every field the extractor fills is editable here: extraction gets things
// wrong, and the profile drives the ranking, so hand edits are the primary
// path rather than a fallback. The save is the sticky bar the page shows
// whenever anything is unsaved (see ProfileSaveBar.jsx), so the whole record,
// entries included, still goes up in one write.
//
// As picked from rendered option A: each field says what it does, and the
// years and the degree are one press each rather than a box and a menu. The
// card's whole width: skills are the longest list and wrap into fewer rows
// across it, and the titles and the places sit side by side on a wide screen.
export default function ProfileForm({ profile, onChange }) {
  const set = (key) => (value) => onChange({ ...profile, [key]: value });
  const yearsId = useId();

  return (
    <ProfileSection id={sectionId('fit')} title="Best fit" icon={TargetIcon} hint={HINT}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <TagInput plain label="Skills" caption={SAYS.skills} values={profile.skills} max={MAX_SKILLS} onChange={set('skills')} />
          <GroupSkillSuggestions skills={profile.skills} skillGroups={profile.skillGroups} onAdd={(more) => set('skills')([...profile.skills, ...more])} />
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <TagInput plain label="Target titles" caption={SAYS.titles} values={profile.titles} onChange={set('titles')} />
          <TagInput plain label="Locations" caption={SAYS.locations} values={profile.locations} onChange={set('locations')} />
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <FitField label="Years of experience" caption={SAYS.years} htmlFor={yearsId}>
            <YearsField id={yearsId} value={profile.years} onChange={set('years')} />
          </FitField>
          <FitField label="Highest degree" caption={SAYS.degree}>
            <PillGroup options={PROFILE_DEGREE_OPTIONS} selected={[profile.degree]} onPick={set('degree')} />
          </FitField>
        </div>
      </div>
    </ProfileSection>
  );
}
