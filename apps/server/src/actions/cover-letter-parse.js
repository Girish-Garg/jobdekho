import { parseJsonObject } from '../ai/loose-json.js'

// The reply is model output shown straight in a textarea, so it is clamped
// to sizes the panel was designed for rather than trusted as is.
const MAX_LETTER = 4000
const MAX_ITEM = 200
const MAX_LIST = 12

const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '')
const list = (value, max) => (Array.isArray(value) ? value.slice(0, max) : [])
const strings = (value) => list(value, MAX_LIST).map((v) => text(v, MAX_ITEM)).filter(Boolean)

// Null when there is no letter to show, which the caller reports as an
// unreadable reply; the two lists are commentary and read fine even empty.
export function parseCoverLetter(raw) {
  const obj = parseJsonObject(raw)
  if (!obj) return null
  const letter = text(obj.letter, MAX_LETTER)
  if (!letter) return null
  return {
    letter,
    usedFromResume: strings(obj.usedFromResume),
    notClaimed: strings(obj.notClaimed),
  }
}
