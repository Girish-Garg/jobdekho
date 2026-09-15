// Mirrors the cap normalizeProfile applies server-side (packages/core), so
// what the person sees before saving matches what actually gets stored.
const MAX_SKILLS = 25;

const clean = (values) => [...new Set((values ?? []).map((s) => String(s).toLowerCase().trim()).filter(Boolean))];

// The flat Skills field backs ranking and stays directly editable for a
// quick fix, but a career's worth of skills actually lives in the grouped
// section. This folds the two together at save time rather than making the
// person keep both lists in sync by hand - a union, never a replace, so
// nothing typed into the flat field is lost just because a group also
// names it.
export function deriveSkills(flatSkills, skillGroups) {
  const grouped = (skillGroups ?? []).flatMap((group) => group.items ?? []);
  return clean([...(flatSkills ?? []), ...grouped]).slice(0, MAX_SKILLS);
}
