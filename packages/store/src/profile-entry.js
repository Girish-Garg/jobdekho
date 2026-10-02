import { randomUUID } from 'node:crypto'
import { entryLinks } from './profile-links.js'

// A resume line is written by a person, not a ranking token: keep whatever
// casing and spacing they typed rather than folding it the way
// normalizeProfile folds skills/titles/locations. Only trimmed, and only
// ever coerced when something other than a string arrives.
const str = (v) => (v === null || v === undefined ? '' : String(v).trim())

// Ordered and deduped, never lowercased: a bullet or a tech tag is prose,
// and "React" next to "react" reads as two different corrections, not one.
const list = (v) => [...new Set((Array.isArray(v) ? v : []).map(str).filter(Boolean))]

const hasId = (src) => typeof src.id === 'string' && src.id

// order mirrors the entry's position in its array: reordering is moving
// array elements, and this field just makes that position readable without
// depending on array order surviving whatever reads the JSON later (a future
// resume builder, or a person opening profile.json by hand).
export function normalizeEntry(input, order) {
  const src = input ?? {}
  const links = entryLinks(src)
  return {
    id: hasId(src) ? src.id : randomUUID(),
    order,
    title: str(src.title),
    organisation: str(src.organisation),
    location: str(src.location),
    startDate: str(src.startDate),
    endDate: str(src.endDate),
    bullets: list(src.bullets),
    tech: list(src.tech),
    links,
    // The one address an entry held before it held a list, kept equal to
    // the first link while anything still reads the old field.
    link: links[0]?.url ?? '',
    // A hint the future resume builder can weigh entries by; no screen here
    // sets weight yet, so it just rides along untouched.
    pinned: Boolean(src.pinned),
    weight: Number.isFinite(Number(src.weight)) ? Number(src.weight) : 0,
  }
}

export function normalizeEntryList(input) {
  return (Array.isArray(input) ? input : []).map((entry, i) => normalizeEntry(entry, i))
}

// Skills are grouped (Languages, Frameworks, ...) rather than one flat list,
// so a hundred skills reads as a handful of rows instead of a wall of tags.
export function normalizeGroup(input, order) {
  const src = input ?? {}
  return { id: hasId(src) ? src.id : randomUUID(), order, name: str(src.name), items: list(src.items) }
}

export function normalizeGroupList(input) {
  return (Array.isArray(input) ? input : []).map((group, i) => normalizeGroup(group, i))
}
