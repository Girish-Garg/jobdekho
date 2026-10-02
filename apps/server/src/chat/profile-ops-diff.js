import { linkName } from '@jobdekho/core/link-kind.js'
import { inBasics } from './profile-op-values.js'

// The lines a proposal card shows, one { label, before, after } per visible
// change, written by the server from the record before and after the op
// (see profile-proposal.js), never by the model: the card has to say what
// Apply will really do. Plain text; a value that spans lines (an entry with
// its bullets) uses "\n" between them.
const SECTION = { experience: 'Experience', projects: 'Projects', education: 'Education', certifications: 'Certifications', achievements: 'Achievements' }
const FIELD = { title: 'title', organisation: 'organisation', location: 'location', startDate: 'start date', endDate: 'end date', bullets: 'bullets', tech: 'stack', link: 'link', links: 'links' }
const SET_LABEL = {
  name: 'Name', headline: 'Headline', email: 'Email', phone: 'Phone', location: 'Location', skills: 'Skills',
  titles: 'Target titles', locations: 'Preferred locations', years: 'Years of experience', degree: 'Highest degree',
  moreLinks: 'More links',
}
const LINK_LABEL = { github: 'GitHub link', linkedin: 'LinkedIn link', portfolio: 'Portfolio link' }

// "Job tracker, Acme (2025): React, Node", the way the example card reads.
export function entryLine(entry) {
  const dates = [entry.startDate, entry.endDate].filter(Boolean).join(' - ')
  const head = [entry.title, entry.organisation].filter(Boolean).join(', ')
  return `${head}${dates ? ` (${dates})` : ''}${entry.tech?.length ? `: ${entry.tech.join(', ')}` : ''}`
}

// A link as the card shows it: the name the resume prints, then where it
// goes, so the address is seen before anyone applies it.
const linkLine = (link) => `${linkName(link)}: ${link.url}`
const LINK_LISTS = new Set(['links', 'moreLinks'])

const withBullets = (entry) => [entryLine(entry), ...(entry.bullets ?? []).map((b) => `- ${b}`), ...(entry.links ?? []).map(linkLine)].join('\n')

function shown(field, value) {
  if (LINK_LISTS.has(field)) return (value ?? []).map(linkLine).join('\n')
  if (Array.isArray(value)) return field === 'bullets' ? value.map((b) => `- ${b}`).join('\n') : value.join(', ')
  return value === null || value === undefined ? '' : String(value)
}

const line = (label, before, after) => (before === after ? [] : [{ label, before, after }])
const byId = (list, id) => list.find((item) => item.id === id)
const groupLine = (group) => `${group.name}: ${group.items.join(', ')}`

function entryDiff(op, before, after) {
  const section = SECTION[op.section]
  if (op.op === 'add') {
    const added = op.position === 'first' ? after[op.section][0] : after[op.section].at(-1)
    return line(`${section}: add`, '', withBullets(added))
  }
  const was = byId(before[op.section], op.id)
  if (op.op === 'remove') return line(`${section}: remove`, withBullets(was), '')
  const now = byId(after[op.section], op.id)
  const name = was.title || was.organisation
  return Object.keys(op.fields).flatMap((key) => line(`${section}: ${name}, ${FIELD[key]}`, shown(key, was[key]), shown(key, now[key])))
}

function groupDiff(op, before, after) {
  if (op.op === 'addGroup') return line('Skill groups: add', '', groupLine(after.skillGroups.at(-1)))
  const was = byId(before.skillGroups, op.id)
  if (op.op === 'removeGroup') return line('Skill groups: remove', groupLine(was), '')
  const now = byId(after.skillGroups, op.id)
  if (op.op === 'renameGroup') return line('Skill groups: rename', was.name, now.name)
  return line(`Skill group ${was.name}`, was.items.join(', '), now.items.join(', '))
}

function setDiff(op, before, after) {
  if (op.field === 'links') {
    return Object.keys(op.value).flatMap((key) => line(LINK_LABEL[key], before.basics.links[key], after.basics.links[key]))
  }
  const read = (w) => (inBasics(op.field) ? w.basics[op.field] : w[op.field])
  return line(SET_LABEL[op.field], shown(op.field, read(before)), shown(op.field, read(after)))
}

// An op whose lines come back empty changed nothing once normalized (the
// same skills in another case, say), and is dropped rather than offered.
export function diffOp(op, before, after) {
  if (op.section) return entryDiff(op, before, after)
  if (op.op === 'set') return setDiff(op, before, after)
  return groupDiff(op, before, after)
}
