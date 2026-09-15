import { useState } from 'react';
import { useProfileState } from '../lib/useProfileState.js';
import ResumeUpload from './ResumeUpload.jsx';
import FillFromResume from './FillFromResume.jsx';
import ExtractedEntriesReview from './ExtractedEntriesReview.jsx';
import CareerSections from './CareerSections.jsx';
import ProfileForm from './ProfileForm.jsx';
import ProfileEmptyState from './ProfileEmptyState.jsx';
import ApplyToAlerts from './ApplyToAlerts.jsx';
import DeleteProfile from './DeleteProfile.jsx';

export default function ProfileView() {
  const { profile, setProfile, exists, proposed, save, adopt, addProposals, dismissProposed, reset } = useProfileState();
  // Local, not part of the hook: starting the blank form by hand is a pure
  // UI choice that never touches the server until Save actually runs.
  const [editing, setEditing] = useState(false);
  const blank = profile !== undefined && !exists && !editing;

  return (
    <section className="px-8 py-8">
      <h2 className="font-display text-2xl font-extrabold tracking-tight">Profile</h2>
      <p className="mt-1 font-mono text-xs text-muted">
        Your full career record. Best fit on Postings scores against the fields at the bottom; a resume builder
        will later draw from everything above them.
      </p>

      {profile === undefined ? (
        <p className="py-10 font-mono text-sm text-muted">Loading your profile...</p>
      ) : (
        <div className="mt-8 flex max-w-3xl flex-col gap-8">
          <div className="flex flex-col gap-3">
            <ResumeUpload resumeName={profile.resumeName} onUploaded={adopt} />
            {profile.resumeName && <FillFromResume profile={profile} onFilled={adopt} />}
          </div>
          {proposed && <ExtractedEntriesReview proposed={proposed} onAdd={addProposals} onDismiss={dismissProposed} />}
          {blank ? (
            <ProfileEmptyState onStart={() => setEditing(true)} />
          ) : (
            <>
              <CareerSections profile={profile} onChange={setProfile} />
              <ProfileForm profile={profile} onChange={setProfile} onSave={save} />
              {exists && (
                <div className="flex flex-col gap-5 border-t border-line pt-6">
                  <ApplyToAlerts />
                  <DeleteProfile
                    onDeleted={() => {
                      reset();
                      setEditing(false);
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
