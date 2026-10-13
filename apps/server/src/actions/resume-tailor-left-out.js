import { ENTRY_SECTIONS } from '@jobdekho/store/profile-sections.js'
import { skillRegex } from '@jobdekho/core/fit-dimensions.js'
import { spellingsOf } from '@jobdekho/core/skill-find.js'
import { skillRows } from '../resume/skill-rows.js'
import { tailoredSections } from '../resume/tailored-sections.js'

// What a plan leaves out of the resume for this posting, held against the
// record in code. A skill wrongly left out costs more than one wrongly
// kept (the person may never notice it is gone), so every rule here errs
// toward keeping.
//
//   skills    the person's own skills and tech this posting has no use for,
//             in their spelling
//   projects  the projects the resume will not carry (see
//             resume/tailored-sections.js), as { id, title }
//   fill      the projects the plan did not pick that the resume carries
//             all the same, so the section is not thin; the person may
//             leave any of them out
const MAX_LEFT_OUT = 40
const MAX_SKILL = 60

// A Skills section thinner than this reads as a person with few skills,
// not as a resume aimed at one job.
export const MIN_SKILLS = 6

const key = (text) => String(text).trim().toLowerCase()

// Asked for by the posting under any spelling core's skill table knows, so
// "Postgres" is not left out of a resume for a job that says "PostgreSQL".
export const askedFor = (skill, jd) => spellingsOf(skill).some((spelling) => skillRegex(spelling).test(jd))

// Every skill the person lists, by lowercased name, in the spelling the
// Skills section prints where it has one.
export function ownSkills(profile, printed = skillRows(profile).flatMap((row) => row.items)) {
  const tech = ENTRY_SECTIONS.flatMap((section) => profile[section] ?? []).flatMap((entry) => entry.tech ?? [])
  return new Map([...tech, ...printed].map((skill) => [key(skill), String(skill).trim()]))
}

function leftOutSkills(raw, profile, jd) {
  const printed = skillRows(profile).flatMap((row) => row.items)
  const own = ownSkills(profile, printed)
  const hay = jd.toLowerCase()
  const asked = (Array.isArray(raw) ? raw : []).slice(0, MAX_LEFT_OUT)
    .filter((skill) => typeof skill === 'string' && skill.length <= MAX_SKILL).map(key)
  const honest = [...new Set(asked)].filter((skill) => own.has(skill) && !askedFor(skill, hay))
  // The model names the least useful first, so the ones past the floor,
  // which stay, are the ones it was least sure of.
  const listed = new Set(printed.map(key))
  let room = Math.max(0, listed.size - MIN_SKILLS)
  return honest.filter((skill) => !listed.has(skill) || room-- > 0).map((skill) => own.get(skill))
}

const named = (projects) => projects.map((project) => ({ id: project.id, title: project.title }))

// `sections` is the plan's checked sections, so the projects named here are
// exactly the ones the rendered resume leaves out, and tops up with.
export function readLeftOut(raw, profile, sections, jd) {
  const shown = tailoredSections(profile, { sections }).projects
  const picked = (sections.projects ?? []).map((entry) => entry.id)
  const rest = (profile.projects ?? []).filter((project) => !picked.includes(project.id))
  return {
    skills: leftOutSkills(raw?.leftOut?.skills, profile, jd),
    projects: named(rest.filter((project) => !shown.includes(project.id))),
    fill: named(rest.filter((project) => shown.includes(project.id))),
  }
}
