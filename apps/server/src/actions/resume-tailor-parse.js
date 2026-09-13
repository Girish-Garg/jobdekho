import { parseJsonObject } from '../ai/loose-json.js'
import { factCheckResume } from './resume-fact-check.js'
import { jdText } from './resume-tailor-prompt.js'

// The reply is model output bound for the browser and a file on disk, so
// every field is clamped to the shape and size the panel was designed for.
// Then the rewrite goes through the fact check against the original resume
// and the posting the route handed over; the saved record carries the
// check's findings beside the model's own account of its changes, and the
// panel leads with the findings.
const MAX_RESUME = 20000
const MAX_KEYWORDS = 40
const MAX_KEYWORD = 40
const MAX_CHANGES = 30
const MAX_SECTION = 40
const MAX_WHAT = 300

const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '')
const list = (value, max) => (Array.isArray(value) ? value.slice(0, max) : [])
const words = (value) => list(value, MAX_KEYWORDS).map((k) => text(k, MAX_KEYWORD)).filter(Boolean)

function change(raw) {
  if (!raw || typeof raw !== 'object') return null
  const what = text(raw.what, MAX_WHAT)
  return what ? { section: text(raw.section, MAX_SECTION), what } : null
}

// Null when there is no object or no resume text in it, which the caller
// reports as an unreadable reply: a tailoring with nothing to show is not a
// result worth saving.
export function parseResumeTailor(raw, { posting = {}, context = {} } = {}) {
  const obj = parseJsonObject(raw)
  if (!obj) return null
  const resume = text(obj.resume, MAX_RESUME).replace(/\r\n?/g, '\n')
  if (!resume) return null
  const keywords = { used: words(obj.keywords?.used), missing: words(obj.keywords?.missing) }
  const changes = list(obj.changes, MAX_CHANGES).map(change).filter(Boolean)
  const { factCheck, coverage } = factCheckResume({
    original: String(context.resumeText || ''),
    tailored: resume,
    jd: jdText(posting),
    keywords: [...keywords.used, ...keywords.missing],
  })
  return { resume, keywords, changes, factCheck, coverage }
}
