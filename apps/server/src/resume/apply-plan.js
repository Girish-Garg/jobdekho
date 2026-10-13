import { ENTRY_SECTIONS } from '@jobdekho/store/profile-sections.js'
import { finalBullets, leftOutSkills, skillKey } from './plan-choices.js'

// Turns a validated resume-tailor plan (see actions/resume-tailor-validate.js)
// into a profile renderTex can use unchanged: an in-memory copy with each
// chosen entry's bullets swapped for its reworded version, and the skills
// the plan leaves out for this job gone from the Skills rows and from every
// entry's Stack line. Whatever the person put back is back (see
// plan-choices.js). Nothing here picks or orders entries - that stays the
// job of the `sections` argument renderTex already takes (see
// resume/selection.js). Nothing is written back to the stored profile; the
// copy exists only for this render.
export function applyPlanBullets(profile, plan) {
  const out = leftOutSkills(plan)
  const keep = (skills) => (skills ?? []).filter((skill) => !out.has(skillKey(skill)))
  const next = {
    ...profile,
    skills: keep(profile.skills),
    skillGroups: (profile.skillGroups ?? []).map((group) => ({ ...group, items: keep(group.items) })),
  }
  for (const key of ENTRY_SECTIONS) {
    const planned = new Map((plan?.sections?.[key] ?? []).map((entry) => [entry.id, entry]))
    next[key] = (profile[key] ?? []).map((entry) => ({
      ...entry,
      tech: keep(entry.tech),
      ...(planned.has(entry.id) ? { bullets: finalBullets(planned.get(entry.id), plan.choices) } : {}),
    }))
  }
  return next
}
