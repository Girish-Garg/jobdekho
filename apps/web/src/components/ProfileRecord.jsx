import ResumeReview from './ResumeReview.jsx';
import ProfileHero from './ProfileHero.jsx';
import CareerSections from './CareerSections.jsx';
import ProfileForm from './ProfileForm.jsx';
import ProfileSaveBar from './ProfileSaveBar.jsx';
import ProfileEmptyState from './ProfileEmptyState.jsx';
import DeleteProfile from './DeleteProfile.jsx';
import ChangedNotice from './ChangedNotice.jsx';
import MemorySection from './MemorySection.jsx';
import { notify } from '../lib/toast.js';

// The record itself, top to bottom: what the resume would change, while it
// still needs a decision (see ResumeReview.jsx), a line on the quickest ways
// to start while nothing is saved, who the record is about, the entry
// sections, skills, the ranking fields, and last the control that acts on
// the saved copy, which only exists once there is one. A person with no
// profile gets this same record, blank and open to type into, with no
// button to press first. The save floats at the bottom while anything is
// unsaved (see ProfileSaveBar.jsx); a chat change applied over unsaved
// edits asks at the top, and stays in view while scrolling, since the
// person may be anywhere in a long record when it lands.
export default function ProfileRecord({ state, applied = null, onDeleted }) {
  const { profile, setProfile, exists, review, applyChanges, discardReview, save, dirty, discard } = state;

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
      {applied?.incoming && (
        <ChangedNotice
          className="sticky top-4 z-20 shadow-pop"
          title="The chat changed your profile while you had unsaved edits"
          detail="Loading the applied version drops your edits. Keeping yours means your next save writes over the chat's change."
          loadLabel="Load the applied version"
          onLoad={applied.load}
          onKeep={applied.keep}
        />
      )}
      {review && <ResumeReview key={review.run} review={review} onApply={applyChanges} onDiscard={discardReview} />}
      {!exists && <ProfileEmptyState />}
      <ProfileHero basics={profile.basics} profile={profile} onChange={(basics) => setProfile({ ...profile, basics })} />
      <CareerSections profile={profile} onChange={setProfile} />
      <ProfileForm profile={profile} onChange={setProfile} />
      <MemorySection />
      <ProfileSaveBar dirty={dirty} fresh={!exists} onSave={saveAndSay} onDiscard={discard} />
      {exists && <DeleteProfile onDeleted={onDeleted} />}
    </div>
  );
}
