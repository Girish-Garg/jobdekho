import ExtractedEntriesReview from './ExtractedEntriesReview.jsx';
import CareerSections from './CareerSections.jsx';
import ProfileForm from './ProfileForm.jsx';
import ApplyToAlerts from './ApplyToAlerts.jsx';
import DeleteProfile from './DeleteProfile.jsx';

// The record itself, top to bottom: whatever the resume proposed and still
// needs a decision, then basics, the entry sections, skills, the ranking
// fields with the save, and last the two controls that act on the saved
// copy, which only exist once there is one.
export default function ProfileRecord({ state, onDeleted }) {
  const { profile, setProfile, exists, proposed, save, addProposals, dismissProposed } = state;

  return (
    <div className="flex min-w-0 flex-col gap-8">
      {proposed && <ExtractedEntriesReview proposed={proposed} onAdd={addProposals} onDismiss={dismissProposed} />}
      <CareerSections profile={profile} onChange={setProfile} />
      <ProfileForm profile={profile} onChange={setProfile} onSave={save} />
      {exists && (
        <div className="flex flex-col gap-5 border-t border-line pt-6">
          <ApplyToAlerts />
          <DeleteProfile onDeleted={onDeleted} />
        </div>
      )}
    </div>
  );
}
