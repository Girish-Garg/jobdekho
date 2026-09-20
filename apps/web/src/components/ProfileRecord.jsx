import ExtractedEntriesReview from './ExtractedEntriesReview.jsx';
import CareerSections from './CareerSections.jsx';
import ProfileForm from './ProfileForm.jsx';
import DeleteProfile from './DeleteProfile.jsx';

// The record itself, top to bottom: whatever the resume proposed and still
// needs a decision, then basics, the entry sections, skills, the ranking
// fields with the save, and last the control that acts on the saved copy,
// which only exists once there is one.
export default function ProfileRecord({ state, onDeleted }) {
  const { profile, setProfile, exists, proposed, save, addProposals, dismissProposed } = state;

  return (
    // Capped rather than left to fill whatever the rail leaves over: a field
    // wide enough to hold a sentence is plenty, however much paper is spare.
    // The cap steps up once at a very wide viewport so the extra room still
    // goes somewhere, matching the wider grids the sections switch to there.
    <div className="flex min-w-0 max-w-[1080px] flex-col gap-8 min-[1500px]:max-w-[1320px]">
      {proposed && <ExtractedEntriesReview proposed={proposed} onAdd={addProposals} onDismiss={dismissProposed} />}
      <CareerSections profile={profile} onChange={setProfile} />
      <ProfileForm profile={profile} onChange={setProfile} onSave={save} />
      {exists && (
        <div className="border-t border-line pt-6">
          <DeleteProfile onDeleted={onDeleted} />
        </div>
      )}
    </div>
  );
}
