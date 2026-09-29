import { useEffect, useState } from 'react';
import { getProfile, putProfile } from '../api.js';
import { withDefaults } from './emptyProfile.js';
import { deriveSkills } from './deriveSkills.js';
import { appendProposals } from './mergeProposals.js';

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

  useEffect(() => {
    let alive = true;
    getProfile()
      .then((p) => alive && (setProfile(withDefaults(p)), setLastSaved(withDefaults(p)), setExists(p !== null)))
      .catch(() => alive && setProfile(withDefaults(null)));
    return () => {
      alive = false;
    };
  }, []);

  async function save() {
    const { resumeName, ...body } = profile;
    const saved = await putProfile({ ...body, skills: deriveSkills(body.skills, body.skillGroups) });
    setProfile(withDefaults(saved));
    setLastSaved(withDefaults(saved));
    setExists(true);
  }

  // Upload and fill-in both save on the server, but neither one ever writes
  // a structured section there (see apps/server/src/api/profile.js) - so
  // only the fields they do change (the flat ranking fields, resumeName)
  // are folded into local state here. Replacing the whole profile with the
  // server's answer instead would revert any section the person had edited
  // locally but not yet saved back to its last-saved copy, which is exactly
  // the silent overwrite the structured record is not supposed to allow.
  // Extraction's proposed entries ride along separately so they can be
  // reviewed before anything is written.
  function adopt(result) {
    const { proposed: found, experience, projects, education, basics, skillGroups, certifications, achievements, ...flat } = result;
    setProfile((p) => ({ ...withDefaults(p), ...flat }));
    setLastSaved((p) => ({ ...withDefaults(p), ...flat }));
    setExists(true);
    const any = found && (found.experience.length || found.projects.length || found.education.length);
    setProposed(any ? found : null);
  }

  function addProposals(chosen) {
    setProfile((p) => ({
      ...p,
      experience: appendProposals(p.experience, chosen.experience),
      projects: appendProposals(p.projects, chosen.projects),
      education: appendProposals(p.education, chosen.education),
    }));
    setProposed(null);
  }

  function reset() {
    setProfile(withDefaults(null));
    setLastSaved(withDefaults(null));
    setExists(false);
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
    profile, setProfile, exists, proposed, save, adopt, addProposals, dismissProposed: () => setProposed(null), reset, dirty, discard, replace, rebase,
  };
}
