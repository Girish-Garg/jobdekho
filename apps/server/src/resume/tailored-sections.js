import { ENTRY_SECTIONS } from '@jobdekho/store/profile-sections.js'

// Which entries a resume made from a tailoring plan carries, section by
// section, as the ids renderTex's `sections` takes (see selection.js).
//
// The plan used to be the whole selection, and the model was told to leave
// out what did not help: a resume came back with one project and no
// education, certifications or skills, which no recruiter reads as tailored,
// only as thin. A plan now decides order and wording, not what exists. The
// entries it picked lead, in its order, with its reworded bullets (see
// apply-plan.js); every other entry of the record follows as the person
// wrote it. The one exception is projects, where a long list of unrelated
// side projects does crowd a page: the picked ones, topped up from the rest
// to at least MIN_PROJECTS when the record has that many.
const MIN_PROJECTS = 3

export function tailoredSections(profile, plan) {
  return Object.fromEntries(ENTRY_SECTIONS.map((key) => {
    const all = (profile?.[key] ?? []).map((entry) => entry.id)
    const picked = (plan?.sections?.[key] ?? []).map((entry) => entry.id).filter((id) => all.includes(id))
    const rest = all.filter((id) => !picked.includes(id))
    if (key !== 'projects') return [key, [...picked, ...rest]]
    const topUp = Math.max(0, Math.min(MIN_PROJECTS, all.length) - picked.length)
    return [key, [...picked, ...rest.slice(0, topUp)]]
  }))
}
