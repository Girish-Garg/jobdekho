// Mirrors the cap core's normalizeProfile applies to the Best fit skills and
// titles (40, the owner's number), so the field stops at what the server
// keeps instead of a save cutting it. A test holds the two equal.
export const MAX_SKILLS = 40;

const key = (skill) => String(skill).trim().toLowerCase();

// The skills the groups name that Best fit does not have yet, in the groups'
// order, one of each. Offered under the Best fit skills to add with a click:
// a save used to fold every group skill in on its own, so skills appeared
// that the person never added, and one they removed came back.
export function groupSkillsMissing(skills, skillGroups) {
  const have = new Set((skills ?? []).map(key));
  const out = [];
  for (const item of (skillGroups ?? []).flatMap((group) => group.items ?? [])) {
    const text = String(item).trim();
    if (!text || have.has(key(text))) continue;
    have.add(key(text));
    out.push(text);
  }
  return out;
}
