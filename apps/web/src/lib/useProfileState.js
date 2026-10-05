import { useRef, useState } from 'react';
import { putProfile } from '../api.js';
import { useProfileLoad } from './useProfileLoad.js';
import { withDefaults } from './emptyProfile.js';
import { adoptResult } from './adoptResult.js';
import { buildReview } from './resumeReview.js';
import { applyReview } from './applyReview.js';

// Everything ProfileView needs to know or do with the profile, kept out of
// the component so its render stays about layout, not data flow.
export function useProfileState() {
  // undefined is "still asking"; exists is false until the server has saved
  // something, even though `profile` itself is always a full-shaped object
  // (see withDefaults) so every section can render without its own guard.
  const [profile, setProfile] = useState(undefined);
  const [exists, setExists] = useState(false);
  // What the last "Fill in from resume" found, as rows to tick (see
  // resumeReview.js), held apart from the profile until the person keeps it.
  const [review, setReview] = useState(null);
  // The last copy the server has, to tell an edited record from a saved one
  // (see ProfileSaveBar.jsx) and to put an edit back.
  const [lastSaved, setLastSaved] = useState(null);
  // The record as it is now, for a review built when the AI answers: the
  // person may have edited it in the half a minute the AI took.
  const latest = useRef(profile);
  latest.current = profile;
  const runs = useRef(0);

  const { failed, retry } = useProfileLoad((p) => {
    setProfile(withDefaults(p));
    setLastSaved(withDefaults(p));
    setExists(p !== null);
  });

  async function save() {
    const { resumeName, ...body } = profile;
    // Best fit is saved as typed: the groups' skills are offered beside it
    // to add (see groupSkills.js), never folded in by the save.
    const saved = await putProfile(body);
    setProfile(withDefaults(saved));
    setLastSaved(withDefaults(saved));
    setExists(true);
  }

  // A new upload names the file and changes nothing else (see
  // adoptResult.js), and a review of the resume it replaced goes with it.
  function adopt(result) {
    setProfile((p) => adoptResult(p, result));
    setLastSaved((p) => adoptResult(p, result));
    setExists(true);
    setReview(null);
  }

  // What the resume says, set beside the record for review; none at all
  // when nothing on it would change the record. Returns the review, so the
  // control that asked can say how it went.
  function reviewResume(found, mode) {
    const built = buildReview(withDefaults(latest.current), found, mode);
    runs.current += 1;
    setReview(built.rows.length ? { ...built, run: runs.current } : null);
    return built;
  }

  // The kept rows, applied to the record as it is now. That makes it
  // unsaved, and Save profile writes it the way it writes a hand edit.
  function applyChanges(rows) {
    setProfile((p) => applyReview(p, rows));
    setReview(null);
  }

  // A deleted profile takes its review with it, so the blank record that
  // follows is the same one a first visit gets.
  function reset() {
    setProfile(withDefaults(null));
    setLastSaved(withDefaults(null));
    setExists(false);
    setReview(null);
  }

  // A whole record the server already saved (a chat proposal applied, see
  // useAppliedProfile.js): shown as is, and taken as the saved copy.
  function replace(record) {
    setProfile(withDefaults(record));
    setLastSaved(withDefaults(record));
    setExists(true);
  }

  // The saved copy moved on under unsaved local edits: they stay on screen,
  // now measured (and discarded) against the new saved copy.
  const rebase = (record) => (setLastSaved(withDefaults(record)), setExists(true));

  // Compared as written, so a field typed and typed back reads as unchanged.
  const dirty = Boolean(profile && lastSaved) && JSON.stringify(profile) !== JSON.stringify(lastSaved);
  const discard = () => lastSaved && setProfile(lastSaved);

  return {
    profile, setProfile, exists, failed, retry, review, reviewResume, applyChanges, discardReview: () => setReview(null),
    save, adopt, reset, dirty, discard, replace, rebase,
  };
}
