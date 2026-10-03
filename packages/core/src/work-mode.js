import { tag, quote } from './tag.js'
import { modeInText } from './work-mode-text.js'

export const WORK_MODES = ['remote', 'hybrid', 'onsite']

const LABEL = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' }

const HYBRID = /\bhybrid\b/i
// "Distributed systems" is a skill and "globally" a reach, so neither says
// where the work happens; only words that do are read here.
const REMOTE = /\bremote\b|work from home|\bwfh\b|\bworldwide\b|\banywhere\b/i
const ONSITE = /\bon[- ]?site\b|\bin[- ]office\b|work from office|\bwfo\b|office\/site only|\boffice[- ]based\b/i

// Hybrid first: "Remote (Hybrid)" and "Bengaluru, Hybrid - Remote" both name
// a desk to show up at, so hybrid is the stronger claim where both appear.
function modeIn(text) {
  if (HYBRID.test(text)) return 'hybrid'
  if (REMOTE.test(text)) return 'remote'
  return ONSITE.test(text) ? 'onsite' : null
}

// A tag counts only when the whole of it is a work mode ("Hybrid", "onsite",
// "Full Time - Remote"): a skill tag such as "Distributed Systems" says
// nothing of where a Mumbai job is worked.
const EMPLOYMENT_WORDS = /\b(?:full[- ]?time|part[- ]?time|employee|employment|permanent|contract)\b/gi
const MODE_ONLY = /^(?:remote|hybrid|on[- ]?site|onsite|in[- ]office|office|office\/site only|work from (?:home|office)|wfh|wfo|remote[_ ]local)$/i
const TAG_MODES = [['hybrid', /hybrid/i], ['remote', /remote|home|wfh/i], ['onsite', /site|office|wfo/i]]

function tagMode(value) {
  const words = String(value).replace(EMPLOYMENT_WORDS, ' ').replace(/[\s\-,]+/g, ' ').trim()
  return MODE_ONLY.test(words) ? TAG_MODES.find(([, re]) => re.test(words))[0] : null
}

// The board's own fields, in order: a workplace field the adapter read, the
// location, then a tag that is itself a work mode.
export function boardWorkMode({ board = null, location = '', tags = [] } = {}) {
  if (board?.workMode) return tag(board.workMode, 'board', `Workplace type: ${LABEL[board.workMode]}`)
  const fromPlace = modeIn(String(location || ''))
  if (fromPlace) return tag(fromPlace, 'board', `Location says ${quote(location)}`)
  const modeTag = (tags || []).find((t) => tagMode(t))
  return modeTag ? tag(tagMode(modeTag), 'board', `Board tag: ${modeTag}`) : null
}

// In a title the mode has to stand apart, "(Remote)" or "- Hybrid": "Remote
// Sensing Scientist" and "Hybrid Cloud Engineer" name a field, and "Onsite
// Coordinator" in Indian IT means a posting abroad.
const SEP = '[()\\[\\]|,/:\\-\\u2013\\u2014]'
const apart = (words) => new RegExp(`(?:^|${SEP})\\s*(?:${words})\\s*(?=$|${SEP}|\\s+(?:india|only)\\b)`, 'i')
const IN_TITLE = [
  ['hybrid', apart('hybrid')],
  ['remote', apart('remote|fully remote|work from home|wfh')],
  ['onsite', apart('on[- ]?site|work from office|wfo|in[- ]office')],
]
const titleMode = (title) => IN_TITLE.find(([, re]) => re.test(String(title || '').replace(/_/g, ' ')))?.[0] ?? null

// Board, then title, then an explicit statement in the description, then
// nothing: an unstated mode is unknown, never assumed to be an office.
export function workModeTag({ board = null, location = '', tags = [], title = '', description = '' } = {}) {
  const fromBoard = boardWorkMode({ board, location, tags })
  if (fromBoard) return fromBoard
  const fromTitle = titleMode(title)
  if (fromTitle) return tag(fromTitle, 'title', `Title says ${LABEL[fromTitle]}`)
  const said = modeInText(description)
  return said ? tag(said.mode, 'text', `Says "${quote(said.words)}"`) : null
}

// The board fields alone, as the value the filters read, or null.
export const classifyWorkMode = (location = '', tags = []) => boardWorkMode({ location, tags })?.value ?? null
