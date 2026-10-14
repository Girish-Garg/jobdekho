import { ENTRY_SECTIONS } from '@jobdekho/store/profile-sections.js'
import { skillRows } from '../resume/skill-rows.js'
import { planEntries } from '../resume/tailored-sections.js'
import { askedFor } from './resume-tailor-left-out.js'
import { jdText } from './resume-tailor-prompt.js'

// A tailoring plan laid out for going through it with the person, a
// question at a time (the web's lib/tailorAsk.js): everything the resume
// could carry, and what the plan did with each thing, before any choice of
// the person's. The web app works out the rest from their choices itself
// (lib/tailorReview.js), so only the choices travel back.
//
//   skills    [{ name, leftOut, asked }]: every skill the resume could print;
//             `leftOut` by the plan, `asked` for by the posting
//   sections  [{ key, title, entries }], each entry
//             { id, title, organisation, state, bullets, dropped, own }
//             state    'picked' by the plan, 'kept' or (a project) 'fill'
//                      when it shows without having been picked, 'out'
//             bullets  [{ now, yours }] for a picked entry; `yours` is ''
//                      where the plan kept the person's words
//             dropped  the person's bullets the plan left out
//             own      an unpicked entry's bullets, as the person wrote them
const TITLES = {
  experience: 'Experience', projects: 'Projects', education: 'Education',
  certifications: 'Certifications', achievements: 'Achievements',
}

const key = (text) => String(text).trim().toLowerCase()

// Case, spacing and a closing full stop apart, a bullet was not reworded.
const plain = (text) => String(text).toLowerCase().replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim()

// The Skills section's own, the posting's first, then the tech the plan
// left out that only ever printed in an entry's Stack line.
function skillsView(profile, plan, jd) {
  const left = (plan.leftOut?.skills ?? [])
  const out = new Set(left.map(key))
  const printed = skillRows(profile, plan.keywords?.used ?? []).flatMap((row) => row.items)
  const listed = new Set(printed.map(key))
  return [...printed, ...left.filter((skill) => !listed.has(key(skill)))]
    .map((name) => ({ name, leftOut: out.has(key(name)), asked: askedFor(key(name), jd) }))
}

function entryView(entry, planned, state) {
  const paired = (now, at) => {
    const yours = (planned.was?.[at] ?? []).join(' ')
    return { now, yours: plain(yours) === plain(now) ? '' : yours }
  }
  return {
    id: entry.id, title: entry.title, organisation: entry.organisation, state,
    bullets: planned ? planned.bullets.map(paired) : null,
    dropped: planned?.dropped ?? [],
    own: planned ? null : entry.bullets ?? [],
  }
}

export function reviewBase(profile, plan, posting) {
  const jd = jdText(posting ?? {}).toLowerCase()
  const sections = ENTRY_SECTIONS.map((section) => {
    const byId = new Map((profile[section] ?? []).map((entry) => [entry.id, entry]))
    const planned = new Map((plan.sections?.[section] ?? []).map((entry) => [entry.id, entry]))
    const { shown, hidden } = planEntries(profile, plan, section)
    const unpicked = section === 'projects' ? 'fill' : 'kept'
    const state = (id) => (planned.has(id) ? 'picked' : hidden.includes(id) ? 'out' : unpicked)
    const entries = [...shown, ...hidden].map((id) => entryView(byId.get(id), planned.get(id), state(id)))
    return { key: section, title: TITLES[section], entries }
  })
  return { skills: skillsView(profile, plan, jd), sections: sections.filter((section) => section.entries.length) }
}
