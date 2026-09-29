// How complete the record is, and the one thing that would help most next.
// Weighted toward what the feed and the resume actually use: skills, titles
// and some experience move Best fit; a name, a way to reach you and an
// education entry are what a resume cannot go without. Links and a headline
// count, but for less. The first missing item in this order is the one
// suggested, so the suggestion is always the most useful step left.
const CHECKS = [
  ['Add your name', 10, (p) => p.basics.name],
  ['Add a role or internship', 15, (p) => p.experience.length > 0],
  ['Add at least five skills', 15, (p) => skillCount(p) >= 5],
  ['Add the job titles you want', 10, (p) => p.titles.length > 0],
  ['Add an email or phone number', 10, (p) => p.basics.email || p.basics.phone],
  ['Add your education', 10, (p) => p.education.length > 0],
  ['Add a project', 10, (p) => p.projects.length > 0],
  ['Say how many years you have worked', 5, (p) => p.years !== null && p.years !== undefined && p.years !== ''],
  ['Add where you want to work', 5, (p) => p.locations.length > 0],
  ['Add a one-line headline', 5, (p) => p.basics.headline],
  ['Add a GitHub, LinkedIn or portfolio link', 5, (p) => Object.values(p.basics.links ?? {}).some(Boolean)],
];

function skillCount(profile) {
  const grouped = profile.skillGroups.flatMap((group) => group.items);
  return new Set([...profile.skills, ...grouped].map((s) => s.toLowerCase())).size;
}

export function profileStrength(profile) {
  let score = 0;
  let next = null;
  for (const [label, weight, done] of CHECKS) {
    if (done(profile)) score += weight;
    else next ??= label;
  }
  return { percent: score, next };
}
