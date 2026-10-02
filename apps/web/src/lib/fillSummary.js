import { PROPOSAL_KEYS } from './mergeProposals.js';

const NOUNS = {
  experience: ['role', 'roles'],
  projects: ['project', 'projects'],
  education: ['programme', 'programmes'],
  certifications: ['certification', 'certifications'],
  achievements: ['achievement', 'achievements'],
  skillGroups: ['skill group', 'skill groups'],
};

const FIELD_NAMES = {
  name: 'name', headline: 'headline', email: 'email', phone: 'phone', location: 'location',
  'links.github': 'GitHub', 'links.linkedin': 'LinkedIn', 'links.portfolio': 'portfolio',
};

const joined = (parts) => (parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`);

// What a finished "Fill in from resume" says it found, section by section,
// so a certification or a link that came through is visible at a glance
// instead of only somewhere further down the review.
export function fillSummary(result) {
  const found = PROPOSAL_KEYS
    .map((key) => [key, result?.proposed?.[key]?.length ?? 0])
    .filter(([, count]) => count > 0)
    .map(([key, count]) => `${count} ${NOUNS[key][count === 1 ? 0 : 1]}`);
  const filled = (result?.filledBasics ?? []).map((path) => FIELD_NAMES[path]).filter(Boolean);
  return [
    'Filled in.',
    found.length ? `Found ${joined(found)} to review.` : '',
    filled.length ? `Added your ${joined(filled)}.` : '',
    'Check the fields, then save.',
  ].filter(Boolean).join(' ');
}
