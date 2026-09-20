import { ENTRY_SECTIONS } from '@jobdekho/store/profile-sections.js'

const field = (label, value) => (value ? `${label}: ${value}` : '')

// One entry as the model sees it: its id (the only thing it may echo back
// unchanged, since that is how a chosen entry is named in the plan) plus
// everything a person would want reworded around, never asked to retype.
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
    ...entry.bullets.map((bullet) => `- ${bullet}`),
  ].filter(Boolean).join('\n')
}

// One block per section that actually has entries in it: a section the
// person has nothing under (no certifications, say) is left out rather than
// shown as a heading with nothing to pick from, the same rule
// resume/sections.js applies to the rendered .tex itself.
export function describeSections(profile) {
  return ENTRY_SECTIONS
    .map((key) => ({ key, entries: profile?.[key] ?? [] }))
    .filter(({ entries }) => entries.length)
    .map(({ key, entries }) => `${key.toUpperCase()}:\n${entries.map(entryBlock).join('\n\n')}`)
    .join('\n\n')
}
