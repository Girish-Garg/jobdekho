import { findSkills } from './skill-find.js'
import { sectionize } from './jd-sections.js'
import { yearsAsked } from './years-asked.js'
import { companyPattern } from './company-words.js'
import { SECTION_WEIGHT } from './jd-weights.js'
import { titleLevel } from './title-level.js'

// What the fit needs from a posting, read once from its FULL description at
// scrape time (normalize.js stores only the first 4000 characters, and big
// ads spend those on company copy before the requirements start). Stored on
// the row, so a feed request only weighs them.
//
//   { v, skills: { id: where }, band: [min, max] | null, from, titleLevel }
//
// `where` is the best place the skill was named (title, req, tags, resp,
// intro, other, nice); the scorer turns it into a weight, so weights can
// change without reading every ad again. Bump FEATURES_VERSION whenever what
// is read changes: rows carrying an older version are read again.
export const FEATURES_VERSION = 2

// The company's own name is blanked, same length so offsets still line up:
// "MongoDB Atlas" in a MongoDB ad is the product, not a requirement.
const blank = (text, own) => (own ? text.replace(own, (m) => ' '.repeat(m.length)) : text)

function unitAt(starts, index) {
  let i = starts.length - 1
  while (i > 0 && starts[i] > index) i -= 1
  return i
}

export function postingFeatures({ title = '', description = '', tags = [], company = '', experienceYears = null }) {
  const own = companyPattern(company)
  const skills = {}
  const note = (id, where) => {
    if (!skills[id] || SECTION_WEIGHT[where] > SECTION_WEIGHT[skills[id]]) skills[id] = where
  }
  for (const h of findSkills(blank(String(title), own))) note(h.id, 'title')
  for (const h of findSkills(blank((tags || []).join(', '), own))) note(h.id, 'tags')
  // One pass over the joined units, each hit mapped back to its unit: a pass
  // per unit was thirty times the work. Units that count for nothing are
  // blanked first, so their skills are never read.
  const units = sectionize(description, company)
  const starts = []
  let joined = ''
  for (const u of units) {
    starts.push(joined.length)
    joined += `${SECTION_WEIGHT[u.section] ? u.text : ' '.repeat(u.text.length)}\n`
  }
  for (const h of findSkills(blank(joined, own))) note(h.id, units[unitAt(starts, h.index)].section)
  const asked = yearsAsked({ title, units, experienceYears })
  return { v: FEATURES_VERSION, skills, band: asked.band, from: asked.from, titleLevel: asked.titleLevel }
}

// Stored features with their title part read again by today's title rules
// (title-rules.js), when those changed and the skills did not: the skills
// were read from the full body, which a stored row may no longer hold, so
// they are kept. Years the text or the board stated still outrank the title.
export function withTitleLevel(features, title) {
  if (!features) return features
  const found = titleLevel(title)
  const titleLevelNow = found?.level ?? null
  if (features.from === 'years' || features.from === 'board') return { ...features, titleLevel: titleLevelNow }
  return { ...features, band: found?.band ?? null, from: found ? 'title' : null, titleLevel: titleLevelNow }
}

// A stored row's features, or ones read now from the text it kept, for rows
// stored before features existed or under an older version.
export function featuresOf(row) {
  if (row?.features?.v === FEATURES_VERSION) return row.features
  return postingFeatures({
    title: row?.title, description: row?.descriptionText || row?.descriptionSnippet || '',
    tags: row?.tags, company: row?.company, experienceYears: row?.experienceYears ?? null,
  })
}
