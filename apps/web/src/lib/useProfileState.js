import { useState } from 'react';
import { putProfile } from '../api.js';
import { useProfileLoad } from './useProfileLoad.js';
import { withDefaults } from './emptyProfile.js';
import { hasProposals, withProposals } from './mergeProposals.js';
import { adoptResult } from './adoptResult.js';

// Everything ProfileView needs to know or do with the profile, kept out of
// the component so its render stays about layout, not data flow.
export function useProfileState() {
  // undefined is "still asking"; exists is false until the server has saved
  // something, even though `profile` itself is always a full-shaped object
  // (see withDefaults) so every section can render without its own guard.
  const [profile, setProfile] = useState(undefined);
  const [exists, setExists] = useState(false);
  // Proposals from the last extraction, held apart from the profile so they
  // can be reviewed - and discarded - without ever becoming part of it.
  const [proposed, setProposed] = useState(null);
  // The last copy the server has, to tell an edited record from a saved one
  // (see ProfileSaveBar.jsx) and to put an edit back.
  const [lastSaved, setLastSaved] = useState(null);

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

  // Only what upload and fill-in change on the server is taken from their
  // answer (see adoptResult.js), so a section edited here but not yet saved
  // survives them. Extraction's proposals are held apart for review.
  function adopt(result) {
    setProfile((p) => adoptResult(p, result, { keepTyped: true }));
    setLastSaved((p) => adoptResult(p, result));
    setExists(true);
    setProposed(hasProposals(result.proposed) ? result.proposed : null);
  }

  function addProposals(chosen) {
    setProfile((p) => withProposals(p, chosen));
    setProposed(null);
  }

  // What a deleted resume proposed goes with it, so the blank record that
  // follows is the same one a first visit gets.
  function reset() {
    setProfile(withDefaults(null));
    setLastSaved(withDefaults(null));
    setExists(false);
    setProposed(null);
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
    profile, setProfile, exists, failed, retry, proposed, save, adopt, addProposals, dismissProposed: () => setProposed(null), reset, dirty, discard, replace, rebase,
  };
}
