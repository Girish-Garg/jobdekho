import { makeEntry, makeGroup } from './newEntry.js';

// Everything "Fill in from resume" can propose, in the order the review
// lists it: the five entry sections, then the skill groups.
export const PROPOSAL_KEYS = ['experience', 'projects', 'education', 'certifications', 'achievements', 'skillGroups'];

// Extraction proposes; this is the one place a proposal becomes part of the
// profile, and it only ever appends. An entry already typed by hand is
// never touched, moved or replaced - the chosen proposals just get a fresh
// id and every field a full entry needs (the AI reply only ever names the
// ones it found something for) and land after whatever was already there.
export function appendProposals(existing, chosen, make = makeEntry) {
  return [...(existing ?? []), ...(chosen ?? []).map((entry) => ({ ...make(), ...entry }))];
}

export const hasProposals = (found) => PROPOSAL_KEYS.some((key) => (found?.[key] ?? []).length > 0);

// Every section's kept proposals at once. A skill group is filled out as a
// group ({ name, items }), not as an entry, so it lands in the Skills section
// looking like one typed there by hand.
export function withProposals(profile, chosen) {
  const next = { ...profile };
  for (const key of PROPOSAL_KEYS) {
    next[key] = appendProposals(profile[key], chosen?.[key], key === 'skillGroups' ? makeGroup : makeEntry);
  }
  return next;
}
