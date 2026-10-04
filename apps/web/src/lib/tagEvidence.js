import { levelLabel, workModeLabel } from './taxonomy.js';

// What each chip says and the words its hover shows, read from the tags the
// server stores beside the plain values (see packages/core/src/tag.js):
// { value, from, evidence }. A chip with no evidence still shows; it simply
// has nothing to explain.

// The level chip doubles as the type chip: an internship level is the only
// way a posting is typed an internship (core's employment.js), so one chip
// says both. The type's evidence rides along when it read something else.
export function levelChip(posting) {
  if (!posting?.level) return null;
  const said = posting.levelTag?.evidence || '';
  const typed = posting.level === 'internship' ? posting.typeTag?.evidence || '' : '';
  const evidence = [said, typed].filter(Boolean).filter((line, i, all) => all.indexOf(line) === i);
  return { label: levelLabel(posting.level), evidence };
}

// The mode most of the page shares says nothing about any one row, so a
// list passes it to leave it out. Unknown has no chip at all, so a stated
// Onsite is a fact as worth a word as Remote.
export function modeChip(posting, dominant = null) {
  if (!posting?.workMode || posting.workMode === dominant) return null;
  const label = workModeLabel(posting.workMode);
  return label ? { label, evidence: [posting.workModeTag?.evidence].filter(Boolean) } : null;
}

// "3 to 5 years", "5+ years", or no experience at all, for the facts line.
export function yearsLabel(years) {
  if (!years || !Number.isFinite(years.min)) return '';
  if (Number.isFinite(years.max) && years.max > years.min) return `${years.min} to ${years.max} years`;
  return years.min === 0 ? 'No experience needed' : `${years.min}+ years`;
}
