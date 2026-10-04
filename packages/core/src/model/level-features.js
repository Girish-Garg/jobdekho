import { content, pairs, units, words } from './tokens.js'
import { companyKey } from '../company-key.js'

// What the level model reads of a posting: its title, its company and its
// description, with every word the step 1 rules read taken out. The model
// is only ever asked about postings those rules could not place, so it is
// trained the same way: on postings the rules did place, with the words
// that placed them hidden, it has to learn from the other clues.
//
// The title words the rules read (title-rules.js), copied rather than
// imported: the shipped weights were learned with exactly this list, and a
// later rule change must not quietly change what the model sees.
const TITLE_MARKERS = new RegExp(`\\b(?:${[
  'interns?', 'internships?', 'apprentices?', 'apprenticeships?', 'co-?op', 'industrial training', 'summer analyst',
  'trainees?', 'traineeship', 'get', 'pget',
  'chief', 'cto', 'ceo', 'coo', 'cfo', 'cio', 'ciso', 'vice[ -]president', 'a?vp', 'head of', 'director', 'president',
  'staff', 'principal', 'distinguished', 'fellow', 'architect',
  'senior', 'snr', 'sr', 'sse', 'lead', 'manager', 'supervisor',
  'graduate', 'new ?grad', 'freshers?', 'fresh graduates?', 'junior', 'jr', 'associate', 'entry[ -]level', 'campus',
  'rotational', 'early career', 'intermediate', 'mid[ -]level', 'i{1,3}', 'iv', 'v',
].join('|')})\\b`, 'gi')

// A unit stating years or months of experience, or naming an internship or
// a traineeship, is what the rules read in a description (level-years.js,
// programme.js): the whole unit goes, since the words around the number
// ("of hands-on experience in") would give it away.
const YEARS = /\d\s*\+?\s*(?:(?:to|-|\u2013|\u2014)\s*\d+\s*\+?\s*)?(?:years?|yrs?|months?)\b|\b(?:experience|exp)\s*(?::|of)?\s*\d/i
const PROGRAMME = /\b(?:interns?|internships?|apprentices?|apprenticeships?|trainees?|traineeships?)\b/i

export const hiddenUnit = (text) => YEARS.test(text) || PROGRAMME.test(text)

export const titleWords = (title) => content(String(title || '').replace(/_/g, ' ').replace(TITLE_MARKERS, ' '))

// How much of its own text a posting has; the model says nothing about a
// posting with less than its trained minimum.
export const textWords = (description) => words(description).length

// Each block (title, company, description) is scaled to unit length, so a
// long description cannot drown the title's few words.
function block(features, names) {
  const value = 1 / Math.sqrt(names.size || 1)
  for (const name of names) features.set(name, value)
}

// Map of feature name to value. "t:" title, "c:" company, "d:" description.
export function levelFeatures({ title = '', company = '', description = '' } = {}) {
  const features = new Map()
  const tw = titleWords(title)
  block(features, new Set(tw.length ? [...tw, ...pairs(tw)].map((w) => `t:${w}`) : ['t:#none']))
  features.set(`c:${companyKey(company)}`, 1)
  const kept = new Set()
  for (const unit of units(description)) {
    if (hiddenUnit(unit.text)) continue
    const dw = content(unit.text).filter((w) => w.length > 1)
    for (const w of [...dw, ...pairs(dw)]) kept.add(`d:${w}`)
  }
  block(features, kept.size ? kept : new Set(['d:#none']))
  return features
}
