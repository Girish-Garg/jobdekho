import { ENTRY_SECTIONS } from './profileSections.js';

// One id per section of the record, shared by the section element and the
// index link that scrolls to it, so neither side has to know the other.
export const sectionId = (key) => `profile-${key}`;

// The index the rail (or the strip, below 1100px) draws: every section in
// the order the record renders them, with a count where one means something.
// Basics and the ranking fields are single forms, so they carry none, and
// what the AI knows is read apart from the profile, so its count stays on
// its own card.
export function indexRows(profile) {
  return [
    { id: sectionId('basics'), label: 'Basics' },
    ...ENTRY_SECTIONS.map((meta) => ({ id: sectionId(meta.key), label: meta.label, count: profile[meta.key].length })),
    { id: sectionId('skills'), label: 'Skills', count: profile.skillGroups.length },
    { id: sectionId('fit'), label: 'Best fit' },
    { id: sectionId('memory'), label: 'What the AI knows' },
  ];
}
