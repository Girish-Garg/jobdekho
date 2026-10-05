// The words around a resume review (see resumeReview.js): the counts at its
// top, the line under its heading, the apply button, the one line for what
// is already on the profile, and what the resume card says once a run is in.
export const MODE_NAMES = { smart: 'Smart add', overwrite: 'Overwrite' };

export const joined = (parts) => (parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`);
export const counted = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function kindCounts(rows) {
  const count = (kind) => rows.filter((row) => row.kind === kind).length;
  return { new: count('new'), newer: count('newer'), remove: count('remove') };
}

// "5 new", "3 newer", "1 to remove", leaving out a kind there is none of.
export function countLabels(rows) {
  const counts = kindCounts(rows);
  return [
    counts.new && { kind: 'new', text: `${counts.new} new` },
    counts.newer && { kind: 'newer', text: `${counts.newer} newer` },
    counts.remove && { kind: 'remove', text: `${counts.remove} to remove` },
  ].filter(Boolean);
}

export const summaryLine = (review) => `${MODE_NAMES[review.mode]} found ${counted(review.rows.length, 'change')}. Nothing is saved until you apply them and save your profile.`;

export const applyLabel = (n) => `Apply ${counted(n, 'change')}`;

const NOUNS = {
  experience: 'role', projects: 'project', education: 'programme', certifications: 'certification', achievements: 'achievement',
};
const FIT_NOUNS = { titles: 'title', locations: 'place' };

// "Already on your profile: 1 role, 2 projects and 11 skills, nothing to
// change". A skill counts once, whether the resume named it in a group, in
// Best fit or in both; years and a degree that match go without saying.
export function sameLine(same) {
  const entries = Object.entries(NOUNS)
    .map(([section, noun]) => [noun, same.filter((item) => item.section === section).length]);
  const skills = new Set(same.filter((item) => item.section === 'skillGroups' || item.field === 'skills').map((item) => item.label.toLowerCase()));
  const fit = Object.entries(FIT_NOUNS).map(([field, noun]) => [noun, same.filter((item) => item.field === field).length]);
  const parts = [...entries, ['skill', skills.size], ...fit].filter(([, n]) => n > 0).map(([noun, n]) => counted(n, noun));
  return parts.length ? `Already on your profile: ${joined(parts)}, nothing to change` : '';
}

// What the resume card says once the review is up, or that there is none.
export function fillLine(review) {
  const n = review.rows.length;
  return n ? `Found ${counted(n, 'change')} to review.` : 'Nothing to change. Your profile already has what this resume says.';
}
