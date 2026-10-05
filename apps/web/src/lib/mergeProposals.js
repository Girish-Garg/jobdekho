import { makeEntry } from './newEntry.js';

// How an entry the resume has and the profile does not joins its section
// once the person keeps it (see applyReview.js): appended, never in place
// of anything already there. Each gets a fresh id and every field a full
// entry needs (the AI reply only ever names the ones it found something
// for) and lands after whatever was already there.
export function appendProposals(existing, chosen, make = makeEntry) {
  return [...(existing ?? []), ...(chosen ?? []).map((entry) => ({ ...make(), ...entry }))];
}
