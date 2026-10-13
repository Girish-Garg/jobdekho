import { ENTRY_SECTIONS } from '@jobdekho/store/profile-sections.js'
import { skillRows } from '../resume/skill-rows.js'

const field = (label, value) => (value ? `${label}: ${value}` : '')

// One entry as the model sees it: its id (the only thing it may echo back
// unchanged, since that is how a chosen entry is named in the plan) plus
// everything a person would want reworded around, never asked to retype.
// The bullets are numbered so the plan can say which one each rewording
// came from, which is what lets the person see the two side by side.
function entryBlock(entry) {
  const dates = [entry.startDate, entry.endDate].filter(Boolean).join(' to ')
  return [
    `id: ${entry.id}`,
    field('title', entry.title),
    field('organisation', entry.organisation),
    field('location', entry.location),
    field('dates', dates),
    field('tech', entry.tech?.join(', ')),
    'bullets:',
    ...entry.bullets.map((bullet, i) => `${i + 1}. ${bullet}`),
  ].filter(Boolean).join('\n')
}

// The skills as the resume prints them (see resume/skill-rows.js), which is
// what a plan may leave some of out. They lead the record: it is cut at a
// length, and the entries at its tail are the ones a cut should cost.
function skillsBlock(profile) {
  const rows = skillRows(profile).map((row) => `${row.name}: ${row.items.join(', ')}`)
  return rows.length ? `SKILLS:\n${rows.join('\n')}` : ''
}

// One block per section that actually has entries in it: a section the
// person has nothing under (no certifications, say) is left out rather than
// shown as a heading with nothing to pick from, the same rule
// resume/sections.js applies to the rendered .tex itself.
export function describeSections(profile) {
  const sections = ENTRY_SECTIONS
    .map((key) => ({ key, entries: profile?.[key] ?? [] }))
    .filter(({ entries }) => entries.length)
    .map(({ key, entries }) => `${key.toUpperCase()}:\n${entries.map(entryBlock).join('\n\n')}`)
  return [skillsBlock(profile ?? {}), ...sections].filter(Boolean).join('\n\n')
}
