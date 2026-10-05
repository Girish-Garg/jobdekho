import { MAX_SKILLS } from './groupSkills.js';

const LISTS = ['skills', 'titles', 'locations'];

// Best fit keeps MAX_SKILLS skills, and the server keeps as many titles the
// same way (see core's normalizeProfile), so a tick past either would be cut
// by the save.
// Places are not counted.
export const CAPPED = ['skills', 'titles'];

const key = (value) => String(value ?? '').trim().toLowerCase();

// The room Best fit has left in each capped list before any of the review
// is applied.
export const roomOf = (profile) => Object.fromEntries(CAPPED.map((field) => [field, MAX_SKILLS - (profile[field]?.length ?? 0)]));

// A skill, title or place the resume names that Best fit lacks is offered
// ticked while there is room for it. Overwrite also lists each one Best fit
// holds that the resume does not name, unticked: a removal is the person's
// to choose. A list the reply left out has no word on anything.
function listRows(field, mine = [], theirs, mode, same) {
  if (!Array.isArray(theirs)) return [];
  const have = new Set(mine.map(key));
  const named = new Set();
  let room = CAPPED.includes(field) ? MAX_SKILLS - mine.length : Infinity;
  const rows = [];
  for (const value of theirs) {
    const k = key(value);
    if (!k || named.has(k)) continue;
    named.add(k);
    if (have.has(k)) same.push({ section: 'fit', field, label: value });
    else rows.push({ id: `fit:${field}:new:${k}`, section: 'fit', field, kind: 'new', value, ticked: room-- > 0 });
  }
  if (mode !== 'overwrite') return rows;
  const gone = mine.filter((value) => key(value) && !named.has(key(value)));
  return [...rows, ...gone.map((value) => ({ id: `fit:${field}:remove:${key(value)}`, section: 'fit', field, kind: 'remove', value, ticked: false }))];
}

// Years and degree: offered ticked where the profile states none. Where it
// states another, Smart add offers the resume's unticked, to opt into, and
// Overwrite ticks it. A degree the resume could not tell ("none") is no word.
function oneRow(field, mine, theirs, mode, same) {
  const none = (value) => value === null || value === undefined || value === '' || (field === 'degree' && value === 'none');
  if (none(theirs)) return [];
  if (mine === theirs) {
    same.push({ section: 'fit', field, label: String(theirs) });
    return [];
  }
  const stated = !none(mine);
  return [{ id: `fit:${field}`, section: 'fit', field, kind: stated ? 'newer' : 'new', value: theirs, before: stated ? mine : null, ticked: !stated || mode === 'overwrite' }];
}

export function fitRows(profile, ranking = {}, mode, same) {
  return [
    ...LISTS.flatMap((field) => listRows(field, profile[field], ranking?.[field], mode, same)),
    ...oneRow('years', profile.years, ranking?.years, mode, same),
    ...oneRow('degree', profile.degree, ranking?.degree, mode, same),
  ];
}
