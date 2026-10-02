import { linkName } from '@jobdekho/core/link-kind.js'
import { ENTRY_SECTIONS } from '@jobdekho/store/profile-sections.js'
import { bulletText } from '../actions/resume-tailor-shown.js'

// Everything the career record says, as the plain lines the fact check reads
// (see fact-flags.js). Shaped like a rendered resume on purpose: dates as
// one "Jul 2023 - Present" line the way resume/sections.js prints them,
// bullets as "- " lines, a role's stack beside it, its links by the names
// the resume prints them under ("Code Demo video", as read from the page).
// The fact check compares spans and runs of words, so the record has to be
// written the way the document writes the same facts, or every honest date
// reads as new. The addresses come too, for a link printed as itself.
function entryLines(entry) {
  const dates = [entry.startDate, entry.endDate].filter(Boolean).join(' - ')
  const links = entry.links ?? []
  return [
    entry.title, [entry.organisation, entry.location].filter(Boolean).join(' | '), dates,
    links.map(linkName).join(' '), bulletText(entry.bullets ?? []), (entry.tech ?? []).join(', '),
    links.map((link) => link.url).join(' '),
  ]
}

export function profileText(profile) {
  if (!profile) return ''
  const basics = profile.basics ?? {}
  const links = [...Object.values(basics.links ?? {}), ...(basics.moreLinks ?? []).map((link) => link.url)]
  return [
    basics.name, basics.headline, basics.email, basics.phone, basics.location, ...links,
    ...ENTRY_SECTIONS.flatMap((key) => (profile[key] ?? []).flatMap(entryLines)),
    ...(profile.skillGroups ?? []).map((group) => `${group.name}: ${(group.items ?? []).join(', ')}`),
    (profile.skills ?? []).join(', '), (profile.titles ?? []).join(', '), (profile.locations ?? []).join(', '),
  ].filter(Boolean).join('\n')
}
