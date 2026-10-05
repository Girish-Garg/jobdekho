const key = (value) => String(value ?? '').trim().toLowerCase();

// The resume's grouped skills against the Skills section. A skill already
// in any of the person's groups is theirs where they put it, so only one
// they have nowhere is offered: into their group of the same name when
// there is one, else into a new group under the resume's name. Overwrite
// also lists each skill the person has that the resume names nowhere,
// unticked, since a removal is theirs to choose.
export function skillGroupRows(groups = [], found = [], mode, same) {
  const have = new Set(groups.flatMap((group) => (group.items ?? []).map(key)));
  const named = new Set();
  const rows = [];
  for (const group of found ?? []) {
    const own = groups.find((mine) => key(mine.name) === key(group.name) && key(group.name));
    for (const value of group.items ?? []) {
      const k = key(value);
      if (!k || named.has(k)) continue;
      named.add(k);
      if (have.has(k)) same.push({ section: 'skillGroups', label: value });
      else rows.push({ id: `skillGroups:new:${k}`, section: 'skillGroups', kind: 'new', value, group: own?.name ?? (group.name || 'Skills'), groupId: own?.id ?? null, ticked: true });
    }
  }
  if (mode !== 'overwrite') return rows;
  for (const group of groups) {
    for (const value of group.items ?? []) {
      if (!key(value) || named.has(key(value))) continue;
      rows.push({ id: `skillGroups:remove:${group.id}:${key(value)}`, section: 'skillGroups', kind: 'remove', value, group: group.name, groupId: group.id, ticked: false });
    }
  }
  return rows;
}
