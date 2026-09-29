import ExtractedEntriesReview from './ExtractedEntriesReview.jsx';
import ProfileHero from './ProfileHero.jsx';
import CareerSections from './CareerSections.jsx';
import ProfileForm from './ProfileForm.jsx';
import ProfileSaveBar from './ProfileSaveBar.jsx';
import DeleteProfile from './DeleteProfile.jsx';
import { notify } from '../lib/toast.js';

// The record itself, top to bottom: whatever the resume proposed and still
// needs a decision, who the record is about, the entry sections, skills, the
// ranking fields, and last the control that acts on the saved copy, which
// only exists once there is one. The save floats at the bottom while
// anything is unsaved (see ProfileSaveBar.jsx).
export default function ProfileRecord({ state, onDeleted }) {
  const { profile, setProfile, exists, proposed, save, addProposals, dismissProposed, dirty, discard } = state;

  // The bar goes the moment nothing is unsaved, so the confirmation is a
  // notice that outlives it rather than a label on a button already gone.
  async function saveAndSay() {
    await save();
    notify({ title: 'Profile saved', kind: 'done' });
  }

  return (
    // Capped rather than left to fill whatever the rail leaves over: a field
    // wide enough to hold a sentence is plenty, however much paper is spare.
    <div className="flex min-w-0 max-w-[1080px] flex-col gap-5 min-[1500px]:max-w-[1200px]">
      {proposed && <ExtractedEntriesReview proposed={proposed} onAdd={addProposals} onDismiss={dismissProposed} />}
      <ProfileHero basics={profile.basics} profile={profile} onChange={(basics) => setProfile({ ...profile, basics })} />
      <CareerSections profile={profile} onChange={setProfile} />
      <ProfileForm profile={profile} onChange={setProfile} />
      <ProfileSaveBar dirty={dirty} fresh={!exists} onSave={saveAndSay} onDiscard={discard} />
      {exists && <DeleteProfile onDeleted={onDeleted} />}
    </div>
  );
}
