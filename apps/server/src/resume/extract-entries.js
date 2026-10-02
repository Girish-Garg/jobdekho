// The AI's reply is read one field at a time: a field of the wrong type is
// dropped on its own, so one garbled date does not cost the whole entry and
// one garbled entry does not cost the rest of the reply.

export const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

// A year comes back as a number often enough ("startDate": 2021) to keep it.
export const text = (v) => (typeof v === 'string' ? v.trim() : Number.isFinite(v) ? String(v) : '')
export const texts = (v) => (Array.isArray(v) ? [...new Set(v.map(text).filter(Boolean))] : [])

// A link ends up as an href in a rendered resume, so only the kinds a resume
// uses survive: a web address with or without its scheme, mail and phone.
// javascript:, data: and the like are dropped however they got into the PDF.
const SCHEME = /^([a-z][a-z0-9+.-]*):/i
const SAFE = ['http', 'https', 'mailto', 'tel']

export function link(v) {
  const value = text(v)
  const scheme = value.match(SCHEME)?.[1].toLowerCase()
  return !scheme || SAFE.includes(scheme) ? value : ''
}

const TEXT_FIELDS = ['title', 'organisation', 'location', 'startDate', 'endDate']
const LIST_FIELDS = ['bullets', 'tech']

// Only the fields the reply filled in: the page makes each kept proposal a
// full entry (see apps/web/src/lib/mergeProposals.js), and an id, a pin or a
// weight is the person's to set, never the AI's.
function entry(src) {
  const out = {}
  for (const key of TEXT_FIELDS) if (text(src[key])) out[key] = text(src[key])
  for (const key of LIST_FIELDS) if (texts(src[key]).length) out[key] = texts(src[key])
  if (link(src.link)) out.link = link(src.link)
  return out
}

// One with neither a title nor an organisation has nothing to show in the
// review and nothing to tell it apart from the next.
export function entryList(v) {
  return (Array.isArray(v) ? v : []).filter(isObject).map(entry).filter((e) => e.title || e.organisation)
}

export function groupList(v) {
  return (Array.isArray(v) ? v : []).filter(isObject)
    .map((g) => ({ name: text(g.name), items: texts(g.items) }))
    .filter((g) => g.items.length)
}
