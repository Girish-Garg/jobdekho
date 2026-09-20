import { escapeLatex, escapeLine, texLink } from './escape.js'

// One entry (a job, a project, a degree, a certification, an achievement)
// becomes a header line plus whatever it has of bullets, a tech line and a
// link line. The subtitle (organisation and location) is built here, not in
// the .tex macro, so the template never has to reason in LaTeX about which
// of the two is present - a plain hyphen joins the dates, never an en dash
// (see the no-slop rule), since a single "-" is not TeX's dash ligature.
function entryHeader(entry) {
  const dates = [entry.startDate, entry.endDate].filter(Boolean).map(escapeLine).join(' - ')
  const subtitle = [entry.organisation, entry.location].filter(Boolean).map(escapeLine).join(' | ')
  return subtitle
    ? `\\resEntryHeader{${escapeLine(entry.title)}}{${subtitle}}{${dates}}`
    : `\\resEntryHeaderPlain{${escapeLine(entry.title)}}{${dates}}`
}

function bulletList(bullets) {
  if (!bullets.length) return ''
  const items = bullets.map((bullet) => `  \\item ${escapeLatex(bullet)}`)
  return ['\\begin{resItems}', ...items, '\\end{resItems}'].join('\n')
}

function entryBlock(entry) {
  const lines = [entryHeader(entry), bulletList(entry.bullets)]
  if (entry.tech.length) lines.push(`\\resMetaLine{Stack: ${escapeLine(entry.tech.join(', '))}}`)
  if (entry.link) lines.push(`\\resMetaLine{${texLink(entry.link)}}`)
  return lines.filter(Boolean).join('\n')
}

// Nothing is emitted for a section with no entries in it: an empty
// \resSection would print a bare heading over blank space, which reads as
// a mistake rather than as "this person has none of these".
export function buildEntrySection(title, entries) {
  if (!entries.length) return ''
  const body = entries.map(entryBlock).join('\n\\resEntrySpace\n')
  return `\\resSection{${escapeLine(title)}}\n${body}`
}

export function buildSkillsSection(title, groups) {
  if (!groups.length) return ''
  const rows = groups
    .filter((group) => group.items.length)
    .map((group) => `\\resSkillRow{${escapeLine(group.name)}}{${escapeLine(group.items.join(', '))}}`)
  return rows.length ? `\\resSection{${escapeLine(title)}}\n${rows.join('\n')}` : ''
}
