import { ENTRY_SECTIONS } from '../lib/profileSections.js';
import EntrySection from './EntrySection.jsx';
import SkillGroupsSection from './SkillGroupsSection.jsx';

// The structured half of the career record: the five generic entry sections
// and the grouped skills (the basics are the hero card above them). Pulled out of ProfileView so the page's
// state and data flow stay readable on their own.
export default function CareerSections({ profile, onChange }) {
  return (
    <>
      {ENTRY_SECTIONS.map((meta) => (
        <EntrySection
          key={meta.key}
          meta={meta}
          entries={profile[meta.key]}
          onChange={(list) => onChange({ ...profile, [meta.key]: list })}
        />
      ))}
      <SkillGroupsSection groups={profile.skillGroups} onChange={(skillGroups) => onChange({ ...profile, skillGroups })} />
    </>
  );
}
