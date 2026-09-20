import { parseJsonObject } from '../ai/loose-json.js'
import { validatePlan } from './resume-tailor-validate.js'

// The reply is model output bound for the browser and a file on disk, so
// keywords are clamped to the shape and size the panel was designed for;
// the plan itself is clamped inside validatePlan, entry by entry, against
// the profile it claims to draw from.
const MAX_KEYWORDS = 40
const MAX_KEYWORD = 40

const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '')
const words = (value) => (Array.isArray(value) ? value.slice(0, MAX_KEYWORDS) : []).map((k) => text(k, MAX_KEYWORD)).filter(Boolean)

// Null when there is no object, or nothing in it survives validation against
// the profile: a plan with nothing left to pick is not a result worth saving,
// and the caller reports it as an unreadable reply the same way a plain
// rewrite with no resume in it always has.
export function parseResumeTailor(raw, { posting = {}, context = {} } = {}) {
  const obj = parseJsonObject(raw)
  if (!obj) return null
  const keywords = { used: words(obj.keywords?.used), missing: words(obj.keywords?.missing) }
  const profile = context.profile ?? {}
  const validated = validatePlan(obj, profile, posting, [...keywords.used, ...keywords.missing])
  if (!validated) return null
  const { sections, flags, coverage } = validated
  return { sections, keywords, factCheck: { flags, ok: flags.length === 0 }, coverage }
}
