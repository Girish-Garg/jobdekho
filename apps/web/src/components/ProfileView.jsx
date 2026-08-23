import { useEffect, useState } from 'react';
import { getProfile, putProfile } from '../api.js';
import ResumeUpload from './ResumeUpload.jsx';
import ProfileForm from './ProfileForm.jsx';
import ProfileEmptyState from './ProfileEmptyState.jsx';
import ApplyToAlerts from './ApplyToAlerts.jsx';
import DeleteProfile from './DeleteProfile.jsx';

const P0 = { skills: [], titles: [], locations: [], years: null, degree: 'none', resumeName: null };

export default function ProfileView() {
  // undefined is "still asking"; null is the server saying there is none.
  const [profile, setProfile] = useState(undefined);
  // Tracked apart from the draft: apply-filter and delete act on the server's
  // copy, which an unsaved hand-edit has not created yet.
  const [exists, setExists] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let alive = true;
    getProfile()
      .then((p) => alive && (setProfile(p), setExists(p !== null)))
      .catch(() => alive && setProfile(null));
    return () => {
      alive = false;
    };
  }, []);

  async function save() {
    const { skills, titles, locations, years, degree } = profile ?? P0;
    const saved = await putProfile({ skills, titles, locations, years, degree });
    setProfile(saved);
    setExists(true);
  }

  const blank = profile === null && !editing;

  return (
    <section className="px-8 py-8">
      <h2 className="font-display text-2xl font-extrabold tracking-tight">Profile</h2>
      <p className="mt-1 font-mono text-xs text-muted">
        What the Recommended sort ranks postings against. It can also seed your notification filter, but only when you say so.
      </p>

      {profile === undefined ? (
        <p className="py-10 font-mono text-sm text-muted">Loading your profile...</p>
      ) : (
        <div className="mt-8 flex max-w-2xl flex-col gap-8">
          <ResumeUpload resumeName={profile?.resumeName} onUploaded={(p) => (setProfile(p), setExists(true))} />
          {blank ? (
            <ProfileEmptyState onStart={() => setEditing(true)} />
          ) : (
            <>
              <ProfileForm profile={profile ?? P0} onChange={setProfile} onSave={save} />
              {exists && (
                <div className="flex flex-col gap-5 border-t border-line pt-6">
                  <ApplyToAlerts />
                  <DeleteProfile
                    onDeleted={() => {
                      setProfile(null);
                      setExists(false);
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
