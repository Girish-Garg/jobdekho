import { ENTRY_SECTIONS } from './profileSections.js';
import { CAPPED } from './resumeFitRows.js';
import { fieldLabel } from './reviewRowText.js';

const LABELS = { basics: 'Basics', ...Object.fromEntries(ENTRY_SECTIONS.map((meta) => [meta.key, meta.label])), skillGroups: 'Skills', fit: 'Best fit' };
const ORDER = ['basics', ...ENTRY_SECTIONS.map((meta) => meta.key), 'skillGroups', 'fit'];

// The review's rows by the part of the record they change, in the order the
// page shows those parts, each named as the page names it.
export function reviewGroups(rows) {
  return ORDER
    .map((key) => ({ key, label: LABELS[key], rows: rows.filter((row) => row.section === key) }))
    .filter((group) => group.rows.length);
}

// A skill, a title or a place is a chip to toggle; an entry, a basics
// field, the years and the degree are rows.
export const isChip = (row) => row.section === 'skillGroups' || (row.section === 'fit' && ['skills', 'titles', 'locations'].includes(row.field));

// Chip rows as lines, each named for what it changes: a Best fit list, or a
// skill group, the person's own or a new one. What the resume does not name
// gets a line of its own, so a removal never reads as one more addition.
export function chipLines(rows) {
  const lines = [];
  for (const row of rows) {
    const name = row.section === 'fit' ? fieldLabel(row.field) : row.group;
    const remove = row.kind === 'remove';
    const label = remove ? `${name}, not on the resume` : row.section === 'skillGroups' && !row.groupId ? `${name}, a new group` : name;
    const key = `${row.section}:${row.field ?? row.group.toLowerCase()}:${remove ? 'remove' : 'add'}`;
    const line = lines.find((item) => item.key === key) ?? lines[lines.push({ key, label, field: row.field ?? null, rows: [] }) - 1];
    line.rows.push(row);
  }
  return lines;
}

const fitRows = (rows, field, kind) => rows.filter((row) => row.section === 'fit' && row.field === field && row.kind === kind);

// How many more of a capped Best fit list could be ticked: the room the
// review started with, and what ticked removals free, less the additions
// ticked already. A review that says nothing of room has no cap.
export function roomLeft(rows, picked, room, field) {
  const ticked = (kind) => fitRows(rows, field, kind).filter((row) => picked.has(row.id)).length;
  return (room?.[field] ?? Infinity) + ticked('remove') - ticked('new');
}

// The ticks with no capped list past its room, the last ticked additions
// giving way first, so "Select all" never keeps more than the save would.
export function withinRoom(rows, picked, room) {
  const next = new Set(picked);
  for (const field of CAPPED) {
    let over = -roomLeft(rows, next, room, field);
    for (const row of fitRows(rows, field, 'new').reverse()) {
      if (over <= 0) break;
      if (next.delete(row.id)) over -= 1;
    }
  }
  return next;
}
