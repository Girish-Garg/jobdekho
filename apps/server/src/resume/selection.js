import { ENTRY_SECTIONS } from '@jobdekho/store/profile-sections.js'

// `ids` is the list a caller wants for one section, in the order it wants
// them - the whole of the contract a job-specific builder (built separately,
// see the module header) will also use to hand this renderer its own pick of
// entries. Deliberately dumb: no scoring, no filtering by relevance, just
// "these ids, in this order". A key the caller never mentions (`undefined`,
// not `[]`) means "everything the profile has, in its own order" - the base
// resume this feature builds before anyone has picked anything.
function pick(entries, ids) {
  if (!Array.isArray(ids)) return entries
  const byId = new Map(entries.map((entry) => [entry.id, entry]))
  return ids.map((id) => byId.get(id)).filter(Boolean)
}

export function applySelection(profile, sections = {}) {
  const picked = { basics: profile.basics ?? {} }
  for (const key of ENTRY_SECTIONS) picked[key] = pick(profile[key] ?? [], sections?.[key])
  picked.skillGroups = pick(profile.skillGroups ?? [], sections?.skillGroups)
  return picked
}
