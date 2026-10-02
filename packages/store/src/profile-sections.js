import { normalizeEntryList, normalizeGroupList } from './profile-entry.js'
import { normalizeLinks } from './profile-links.js'

const str = (v) => (v === null || v === undefined ? '' : String(v).trim())

const LINK_KEYS = ['github', 'linkedin', 'portfolio']

function normalizeBasics(input) {
  const src = input ?? {}
  const links = src.links ?? {}
  return {
    name: str(src.name), headline: str(src.headline), email: str(src.email),
    phone: str(src.phone), location: str(src.location),
    links: Object.fromEntries(LINK_KEYS.map((key) => [key, str(links[key])])),
    // Every other profile worth a link (Kaggle, LeetCode, a blog), held
    // apart from the three named ones so a reader of `links` still finds
    // three strings there.
    moreLinks: normalizeLinks(src.moreLinks),
  }
}

// Entries a resume needs beyond the ranking fields: one shared shape (see
// profile-entry.js) fits a job, a project, a degree, a certification and an
// achievement alike, which is why one list of names drives all five sections.
export const ENTRY_SECTIONS = ['experience', 'projects', 'education', 'certifications', 'achievements']

// Carry-forward-if-absent: the same rule upsertProfile already applies to the
// resume text (see profiles.js), extended to every structured section. A
// caller that sends only the fields it means to change - the flat ranking
// form, a re-extraction that only ever carries flat fields - must never wipe
// a hundred hand-typed entries just because this particular PUT did not
// mention them. A caller that does mean to change a section sends it in
// full; normalizeEntryList/normalizeGroupList then own its shape.
export function normalizeSections(input, current = {}) {
  const src = input ?? {}
  const sections = { basics: 'basics' in src ? normalizeBasics(src.basics) : (current.basics ?? normalizeBasics({})) }
  for (const key of ENTRY_SECTIONS) {
    sections[key] = key in src ? normalizeEntryList(src[key]) : (current[key] ?? [])
  }
  sections.skillGroups = 'skillGroups' in src ? normalizeGroupList(src.skillGroups) : (current.skillGroups ?? [])
  return sections
}
