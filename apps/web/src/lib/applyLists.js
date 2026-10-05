import { makeGroup } from './newEntry.js';
import { MAX_SKILLS } from './groupSkills.js';
import { CAPPED } from './resumeFitRows.js';

const key = (value) => String(value ?? '').trim().toLowerCase();
const of = (rows, kind) => rows.filter((row) => row.kind === kind);

// A skill kept from the review goes into the group it was offered for: the
// person's own (by id), or a new one under the resume's name, made once
// however many skills land in it. A removal takes the skill out of its
// group, and a group left empty by removals goes with it.
export function applySkillGroups(groups, rows) {
  const gone = new Set(of(rows, 'remove').map((row) => `${row.groupId}\n${key(row.value)}`));
  let next = groups
    .map((group) => ({ group, items: (group.items ?? []).filter((item) => !gone.has(`${group.id}\n${key(item)}`)) }))
    .filter(({ group, items }) => items.length || !(group.items ?? []).length)
    .map(({ group, items }) => (items.length === (group.items ?? []).length ? group : { ...group, items }));
  for (const row of of(rows, 'new')) {
    const at = next.findIndex((group) => group.id === row.groupId || (group.fresh && key(group.name) === key(row.group)));
    const group = at >= 0 ? next[at] : { ...makeGroup(), name: row.group, items: [], fresh: true };
    const added = group.items.some((item) => key(item) === key(row.value)) ? group : { ...group, items: [...group.items, row.value] };
    next = at >= 0 ? next.map((g, i) => (i === at ? added : g)) : [...next, added];
  }
  return next.map(({ fresh, ...group }) => group);
}

// Best fit: removals first, so the room they make is there for the
// additions, which stop at the cap the field keeps. Years and degree take
// the resume's value outright.
export function applyFit(profile, rows) {
  const next = { ...profile };
  for (const field of ['skills', 'titles', 'locations']) {
    const mine = rows.filter((row) => row.field === field);
    if (!mine.length) continue;
    const gone = new Set(of(mine, 'remove').map((row) => key(row.value)));
    const list = (profile[field] ?? []).filter((value) => !gone.has(key(value)));
    for (const row of of(mine, 'new')) {
      if (list.some((value) => key(value) === key(row.value))) continue;
      if (CAPPED.includes(field) && list.length >= MAX_SKILLS) break;
      list.push(row.value);
    }
    next[field] = list;
  }
  for (const row of rows.filter((r) => r.field === 'years' || r.field === 'degree')) next[row.field] = row.value;
  return next;
}

// Into an empty field only: the person may have typed one while the review
// was open, and what they typed wins.
export function applyBasics(basics, rows) {
  if (!rows.length) return basics;
  const next = { ...basics, links: { ...basics?.links } };
  for (const row of rows) {
    const [field, sub] = row.field.split('.');
    const target = sub ? next.links : next;
    const name = sub ?? field;
    if (!String(target[name] ?? '').trim()) target[name] = row.value;
  }
  return next;
}
