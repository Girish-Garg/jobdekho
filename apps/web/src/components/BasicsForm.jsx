import { sectionId } from '../lib/profileIndex.js';
import ProfileSection from './ProfileSection.jsx';
import { TextField } from './ProfileField.jsx';

// Name, contact and links: the header a resume builder puts at the top of
// every document, kept apart from the ranking fields at the end because
// none of this feeds Best fit.
export default function BasicsForm({ basics, onChange }) {
  const set = (key) => (value) => onChange({ ...basics, [key]: value });
  const setLink = (key) => (value) => onChange({ ...basics, links: { ...basics.links, [key]: value } });

  return (
    <ProfileSection id={sectionId('basics')} title="Basics" hint="Who the record is about: the header of every resume built from it.">
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        <TextField label="Name" value={basics.name} onChange={set('name')} />
        <TextField label="Headline" value={basics.headline} onChange={set('headline')} placeholder="e.g. Backend engineer" />
        <TextField label="Email" value={basics.email} onChange={set('email')} />
        <TextField label="Phone" value={basics.phone} onChange={set('phone')} />
        <TextField label="Location" value={basics.location} onChange={set('location')} />
        <TextField label="GitHub" value={basics.links.github} onChange={setLink('github')} />
        <TextField label="LinkedIn" value={basics.links.linkedin} onChange={setLink('linkedin')} />
        <TextField label="Portfolio" value={basics.links.portfolio} onChange={setLink('portfolio')} />
      </div>
    </ProfileSection>
  );
}
