import { ENTRY_SECTIONS } from '@jobdekho/store/profile-sections.js'
import { bulletText } from '../actions/resume-tailor-shown.js'

// Everything the career record says, as the plain lines the fact check reads
// (see fact-flags.js). Shaped like a rendered resume on purpose: dates as
// one "Jul 2023 - Present" line the way resume/sections.js prints them,
// bullets as "- " lines, a role's stack beside it. The fact check compares
// spans and runs of words, so the record has to be written the way the
// document writes the same facts, or every honest date reads as new.
function entryLines(entry) {
  const dates = [entry.startDate, entry.endDate].filter(Boolean).join(' - ')
  return [
    entry.title, [entry.organisation, entry.location].filter(Boolean).join(' | '), dates,
    bulletText(entry.bullets ?? []), (entry.tech ?? []).join(', '), entry.link,
  ]
}

export function profileText(profile) {
  if (!profile) return ''
  const basics = profile.basics ?? {}
  const links = Object.values(basics.links ?? {})
  return [
    basics.name, basics.headline, basics.email, basics.phone, basics.location, ...links,
    ...ENTRY_SECTIONS.flatMap((key) => (profile[key] ?? []).flatMap(entryLines)),
    ...(profile.skillGroups ?? []).map((group) => `${group.name}: ${(group.items ?? []).join(', ')}`),
    (profile.skills ?? []).join(', '), (profile.titles ?? []).join(', '), (profile.locations ?? []).join(', '),
  ].filter(Boolean).join('\n')
}
