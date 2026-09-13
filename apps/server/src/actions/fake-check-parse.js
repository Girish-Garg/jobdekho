import { parseJsonObject } from '../ai/loose-json.js'

export const VERDICTS = ['genuine', 'probably_genuine', 'unclear', 'suspicious', 'likely_scam']

// The reply is model output and gets shown in the browser, so every field is
// clamped to the shape and size the panel was designed for. A verdict the
// panel has no word for reads as "unclear" rather than as nothing, since a
// check that ran and was thrown away would just get run again.
const MAX_CHECKS = 12
const MAX_FLAGS = 12
const MAX_SOURCES = 5
const MAX_TEXT = 600
const MAX_LABEL = 120
const MAX_URL = 500

const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '')
const tri = (value) => (value === true || value === false ? value : null)
const list = (value, max) => (Array.isArray(value) ? value.slice(0, max) : [])

// Only links a browser can open safely: a javascript: or file: URL in a
// source list would otherwise render as a link on the page.
function isHttp(value) {
  if (typeof value !== 'string' || value.length > MAX_URL) return false
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

function check(raw) {
  if (!raw || typeof raw !== 'object') return null
  const label = text(raw.label, MAX_LABEL)
  if (!label) return null
  return {
    label,
    finding: text(raw.finding, MAX_TEXT),
    ok: tri(raw.ok),
    sources: list(raw.sources, MAX_SOURCES).filter(isHttp),
  }
}

// Null when there is no object to read at all, which the caller reports as
// an unreadable reply; anything that is an object is read as best it can be.
export function parseFakeCheck(raw) {
  const obj = parseJsonObject(raw)
  if (!obj) return null
  return {
    verdict: VERDICTS.includes(obj.verdict) ? obj.verdict : 'unclear',
    stillOpen: tri(obj.stillOpen),
    summary: text(obj.summary, MAX_TEXT),
    checks: list(obj.checks, MAX_CHECKS).map(check).filter(Boolean),
    redFlags: list(obj.redFlags, MAX_FLAGS).map((f) => text(f, MAX_TEXT)).filter(Boolean),
  }
}
