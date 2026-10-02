// Where a saved preference applies, in the order the Profile page groups
// them, with the words a person reads for each (the server's store keeps the
// keys, see packages/store/src/memory.js).
export const MEMORY_SCOPES = [
  { key: 'everywhere', label: 'Everywhere' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'resume', label: 'Resume' },
  { key: 'letters', label: 'Cover letters' },
];

export const MAX_MEMORY_TEXT = 200;
