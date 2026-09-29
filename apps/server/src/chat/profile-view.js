import { ENTRY_SECTIONS } from '@jobdekho/store/profile-sections.js'

// The whole career record as the profile and resume pages show it to the
// model: every entry with its id (the only way an "update" or "remove"
// can name one, see profile-proposal.js), every field a person types, and
// nothing the store keeps for itself (order, pinned, weight, the uploaded
// file's name). On the feed the chat still gets only the summary in
// profile-summary.js; this fuller view is for the pages where changing the
// record is the point.
const ENTRY_KEYS = ['id', 'title', 'organisation', 'location', 'startDate', 'endDate', 'bullets', 'tech', 'link']

const entries = (list) => (list ?? []).map((entry) => Object.fromEntries(ENTRY_KEYS.map((key) => [key, entry[key]])))

export function profileView(record) {
  if (!record) return null
  return {
    basics: record.basics ?? {},
    skills: record.skills ?? [],
    titles: record.titles ?? [],
    locations: record.locations ?? [],
    years: record.years ?? null,
    degree: record.degree ?? 'none',
    skillGroups: (record.skillGroups ?? []).map(({ id, name, items }) => ({ id, name, items })),
    ...Object.fromEntries(ENTRY_SECTIONS.map((key) => [key, entries(record[key])])),
  }
}
