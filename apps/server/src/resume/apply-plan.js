import { ENTRY_SECTIONS } from '@jobdekho/store/profile-sections.js'

// Turns a validated resume-tailor plan (see actions/resume-tailor-validate.js)
// into a profile renderTex can use unchanged: an in-memory copy with each
// chosen entry's bullets swapped for its reworded version. Nothing here picks
// or orders entries - that stays the job of the `sections` argument renderTex
// already takes (see resume/selection.js), so a person can still tick an
// entry in or out and reorder after the plan seeded the resume builder, and
// the reworded wording follows whichever entries they leave checked. Nothing
// is written back to the stored profile; the copy exists only for this render.
export function applyPlanBullets(profile, plan) {
  const next = { ...profile }
  for (const key of ENTRY_SECTIONS) {
    const bulletsById = new Map((plan?.sections?.[key] ?? []).map((entry) => [entry.id, entry.bullets]))
    next[key] = (profile[key] ?? []).map((entry) => (
      bulletsById.has(entry.id) ? { ...entry, bullets: bulletsById.get(entry.id) } : entry
    ))
  }
  return next
}
