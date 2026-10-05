import { ENTRY_SECTIONS } from './profileSections.js';
import { appendProposals } from './mergeProposals.js';
import { mergeEntry } from './entryChanges.js';
import { applyBasics, applyFit, applySkillGroups } from './applyLists.js';

const of = (rows, kind) => rows.filter((row) => row.kind === kind);

// One section's kept rows, on the list as it is now (the person may have
// edited it while the review was open). A removal goes by id, and a Newer
// one takes the resume's word on its changed fields in place, keeping the
// entry's id, its place and anything the resume has no word on, such as a
// pin. New ones land after everything, as hand-picked proposals always
// have (see mergeProposals.js). An entry deleted meanwhile is let go.
function applyEntries(list = [], rows) {
  const gone = new Set(of(rows, 'remove').map((row) => row.target));
  const newer = new Map(of(rows, 'newer').map((row) => [row.target, row]));
  const kept = list
    .filter((entry) => !gone.has(entry.id))
    .map((entry) => (newer.has(entry.id) ? mergeEntry(entry, newer.get(entry.id).entry, newer.get(entry.id).fields) : entry));
  return appendProposals(kept, of(rows, 'new').map((row) => row.entry));
}

// The profile with the kept rows of a review applied (see resumeReview.js),
// in local state only: the record is then unsaved, and Save profile writes
// it the way it writes a hand edit. Rows left unticked never get here.
export function applyReview(profile, rows = []) {
  const section = (key) => rows.filter((row) => row.section === key);
  const next = { ...profile };
  for (const { key } of ENTRY_SECTIONS) next[key] = applyEntries(profile[key], section(key));
  next.skillGroups = applySkillGroups(profile.skillGroups ?? [], section('skillGroups'));
  next.basics = applyBasics(profile.basics, section('basics'));
  return applyFit(next, section('fit'));
}
