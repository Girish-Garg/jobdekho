import { DEGREES } from '@jobdekho/core/degree.js'
import { isObject, text, texts, link, entryList, groupList } from './extract-entries.js'

const LISTS = ['skills', 'titles', 'locations']
const BASIC_FIELDS = ['name', 'headline', 'email', 'phone', 'location']
const LINK_KEYS = ['github', 'linkedin', 'portfolio']
const ENTRY_KEYS = ['experience', 'projects', 'education', 'certifications', 'achievements']

function years(v) {
  const n = typeof v === 'string' && v.trim() ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : undefined
}

// Only the ranking fields the reply carries in a usable form. One the model
// left out or garbled is absent here rather than blank, so the route keeps
// what the profile already holds for it (see api/profile-fill.js) instead of
// saving an empty list over the person's skills because of one bad reply.
function flatFields(src) {
  const out = {}
  for (const key of LISTS) if (Array.isArray(src[key])) out[key] = texts(src[key])
  if (years(src.years) !== undefined) out.years = years(src.years)
  if (DEGREES.includes(src.degree)) out.degree = src.degree
  return out
}

function basicsFields(src) {
  const basics = isObject(src) ? src : {}
  const links = isObject(basics.links) ? basics.links : {}
  return {
    ...Object.fromEntries(BASIC_FIELDS.map((key) => [key, text(basics[key])])),
    links: Object.fromEntries(LINK_KEYS.map((key) => [key, link(links[key])])),
  }
}

// The parsed reply, whatever shape it came back in, as the three things the
// route does with it: ranking fields to save, basics to fill where empty,
// and the lists to propose.
export function readExtraction(parsed) {
  const src = isObject(parsed) ? parsed : {}
  return {
    flat: flatFields(src),
    basics: basicsFields(src.basics),
    proposed: {
      ...Object.fromEntries(ENTRY_KEYS.map((key) => [key, entryList(src[key])])),
      skillGroups: groupList(src.skillGroups),
    },
  }
}
