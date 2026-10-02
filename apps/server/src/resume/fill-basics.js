const FIELDS = ['name', 'headline', 'email', 'phone', 'location']
const LINK_KEYS = ['github', 'linkedin', 'portfolio']

const blank = (v) => !String(v ?? '').trim()

// A basics field the person has already filled is theirs, whatever the
// resume says: only an empty one takes the resume's value. `filled` names
// each one taken ("name", "links.github"), so the page can say which, and
// fold just those into a form it may be holding unsaved edits in. The
// basics come back whole, ready to write, even for a profile that had none.
export function fillBasics(current, found) {
  const basics = {
    ...Object.fromEntries(FIELDS.map((key) => [key, current?.[key] ?? ''])),
    links: Object.fromEntries(LINK_KEYS.map((key) => [key, current?.links?.[key] ?? ''])),
  }
  const filled = []
  for (const key of FIELDS) {
    if (!blank(basics[key]) || blank(found?.[key])) continue
    basics[key] = found[key]
    filled.push(key)
  }
  for (const key of LINK_KEYS) {
    if (!blank(basics.links[key]) || blank(found?.links?.[key])) continue
    basics.links[key] = found.links[key]
    filled.push(`links.${key}`)
  }
  return { basics, filled }
}
