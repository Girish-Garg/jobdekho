import { ENTRY_SECTIONS } from './profileSections.js';
import { matchEntries } from './resumeMatch.js';
import { entryDiff, isNewer } from './entryChanges.js';
import { basicsRows, fitRows, roomOf } from './resumeFitRows.js';
import { skillGroupRows } from './resumeSkillRows.js';

// One section's entries, resume against profile (see resumeMatch.js). An
// entry the profile does not have is New, ticked. One it has is Newer,
// ticked, when the resume's version is newer or fuller (entryChanges.js),
// and otherwise is the same as far as Smart add goes. Overwrite also lists
// every entry the resume does not have, unticked: each removal is the
// person's to confirm, and leaving it is keeping it.
function entryRows(section, mine = [], theirs = [], mode, same) {
  const pairs = matchEntries(mine, theirs);
  const rows = theirs.flatMap((entry, t) => {
    if (!pairs.has(t)) return [{ id: `${section}:new:${t}`, section, kind: 'new', entry, ticked: true }];
    const own = mine[pairs.get(t)];
    const fields = entryDiff(section, own, entry);
    if (!isNewer(section, own, entry, fields)) {
      same.push({ section, label: own.title || own.organisation });
      return [];
    }
    return [{ id: `${section}:newer:${own.id}`, section, kind: 'newer', target: own.id, before: own, entry, fields, ticked: true }];
  });
  if (mode !== 'overwrite') return rows;
  const kept = new Set(pairs.values());
  const gone = mine.filter((_, m) => !kept.has(m));
  return [...rows, ...gone.map((own) => ({ id: `${section}:remove:${own.id}`, section, kind: 'remove', target: own.id, entry: own, ticked: false }))];
}

// Everything one "Fill in from resume" would change, as rows to tick, built
// from what the server read (`found`: { ranking, basics, proposed }, see the
// server's api/profile-fill.js) against the profile on the page. Nothing
// here changes the profile; applyReview.js does, with the rows kept.
//
//   { mode, rows, same, room }
//
// A row is { id, section, kind: 'new' | 'newer' | 'remove', ticked, ... }:
// an entry's carries the entry (and for Newer the profile's own as
// `before`, the fields that change and the target id); a skill, a title,
// a place or a basics field carries `field` and `value`. `same` lists what
// the resume has that the profile already holds, for the one line that
// says so, and `room` is what Best fit has left in its capped lists.
export function buildReview(profile, found, mode) {
  const same = [];
  const proposed = found?.proposed ?? {};
  const rows = [
    ...basicsRows(profile.basics, found?.basics),
    ...ENTRY_SECTIONS.flatMap(({ key }) => entryRows(key, profile[key], proposed[key], mode, same)),
    ...skillGroupRows(profile.skillGroups, proposed.skillGroups, mode, same),
    ...fitRows(profile, found?.ranking, mode, same),
  ];
  return { mode, rows, same, room: roomOf(profile) };
}

// Smart add and Overwrite part ways only over what the profile already
// holds: what to remove, and a stated years or degree. On a profile with
// none of that they are one choice, and the picker is not worth a click.
export function modesDiffer(profile) {
  const held = ENTRY_SECTIONS.some(({ key }) => profile[key]?.length)
    || (profile.skillGroups ?? []).some((group) => group.items?.length)
    || ['skills', 'titles', 'locations'].some((key) => profile[key]?.length);
  return held || (profile.years !== null && profile.years !== undefined) || (profile.degree ?? 'none') !== 'none';
}
