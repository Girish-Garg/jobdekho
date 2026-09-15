import { makeEntry } from './newEntry.js';

// Extraction proposes; this is the one place a proposal becomes part of the
// profile, and it only ever appends. An entry already typed by hand is
// never touched, moved or replaced - the chosen proposals just get a fresh
// id and every field a full entry needs (the AI reply only ever names the
// ones it found something for) and land after whatever was already there.
export function appendProposals(existing, chosen) {
  return [...(existing ?? []), ...(chosen ?? []).map((entry) => ({ ...makeEntry(), ...entry }))];
}
