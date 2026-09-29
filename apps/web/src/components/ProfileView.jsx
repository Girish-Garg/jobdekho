import { useState } from 'react';
import { useProfileState } from '../lib/useProfileState.js';
import { useAppliedProfile } from '../lib/useAppliedProfile.js';
import { useMediaQuery } from '../lib/useMediaQuery.js';
import { useCurrentSection } from '../lib/useCurrentSection.js';
import { indexRows } from '../lib/profileIndex.js';
import ResumeUpload from './ResumeUpload.jsx';
import FillFromResume from './FillFromResume.jsx';
import ProfileRail from './ProfileRail.jsx';
import ProfileIndex from './ProfileIndex.jsx';
import ProfileRecord from './ProfileRecord.jsx';
import ProfileEmptyState from './ProfileEmptyState.jsx';

// Below this there is no room for an index beside a 760px record, so the
// index becomes a strip that sticks under the topbar; the same threshold
// PostingsView uses for its detail pane.
const WIDE_QUERY = '(min-width: 1100px)';

export default function ProfileView() {
  const state = useProfileState();
  const { profile, exists, adopt, reset } = state;
  // A chat proposal applied while this page is open (see useAppliedProfile.js).
  const applied = useAppliedProfile(state);
  // Local, not part of the hook: starting the blank form by hand is a pure
  // UI choice that never touches the server until Save actually runs.
  const [editing, setEditing] = useState(false);
  const wide = useMediaQuery(WIDE_QUERY);
  const blank = profile !== undefined && !exists && !editing;
  // No index for a record that is not on screen yet: the links would have
  // nothing to scroll to.
  const rows = profile === undefined || blank ? [] : indexRows(profile);
  const [current, jumpTo] = useCurrentSection(rows.map((row) => row.id));

  const resume = profile && (
    <ResumeUpload resumeName={profile.resumeName} onUploaded={adopt}>
      {profile.resumeName && <FillFromResume profile={profile} onFilled={adopt} />}
    </ResumeUpload>
  );
  const body = blank ? (
    <ProfileEmptyState onStart={() => setEditing(true)} />
  ) : (
    <ProfileRecord
      state={state}
      applied={applied}
      onDeleted={() => {
        reset();
        setEditing(false);
      }}
    />
  );

  return (
    <section className="mx-auto max-w-[1400px] px-6 pb-10 pt-6 sm:px-8">
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Profile</h1>
      <p className="mt-0.5 max-w-2xl text-sm text-muted">
        Your full career record. New resumes start from it, the chat can add to it for you, and Best fit on Postings scores against the fields at the end.
      </p>

      {profile === undefined ? (
        <p className="py-10 text-sm text-muted">Loading your profile...</p>
      ) : wide ? (
        <div className="mt-6 grid grid-cols-[250px_minmax(0,1fr)] items-start gap-x-8 min-[1500px]:gap-x-10">
          <ProfileRail rows={rows} current={current} onJump={jumpTo}>
            {resume}
          </ProfileRail>
          {body}
        </div>
      ) : (
        <>
          {rows.length > 0 && (
            <div className="sticky top-0 z-10 -mx-8 mt-6 border-b border-line bg-paper px-8">
              <ProfileIndex horizontal rows={rows} current={current} onJump={jumpTo} />
            </div>
          )}
          <div className="mt-6 flex max-w-3xl flex-col gap-8">
            {resume}
            {body}
          </div>
        </>
      )}
    </section>
  );
}
