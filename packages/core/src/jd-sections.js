import { HEADINGS, WEAK, NICE_CUE, ABOUT_CUE, YOU_CUE } from './jd-headings.js'
import { companyPattern } from './company-words.js'

// Cuts a job ad into units (sentences, bullets, inline headings) and labels
// each with the section it sits in: intro, about, resp (duties), req,
// nice, benefits, eeo or other. The fit reads a skill named under
// "Requirements" as what the job needs and one under "About us" or "Bonus
// points" as not, which a plain word search cannot tell apart.
//
// Unit edges: line breaks, a sentence end before a capital, bullets (dash,
// star, dot, and the en and em dashes some boards use, matched by code
// point), and "1." style numbering.
const EDGE = /\n+|(?<=[.!?…])\s+(?=[A-Z(•*-])|\s+[-*•▪●\u2013\u2014]\s+|\s+\d{1,2}[.)]\s+|(?<=:)\s+(?=[-*•]|\d{1,2}[.)])/

// Bodies stored before the HTML pass kept tag names as bare tokens ("p
// strong About us /strong /p"), which would hide a heading behind a "p".
const RESIDUE = /(?:^|\s)(?:\/?(?:p|li|ul|ol|div|br|strong|em|span|h[1-6]|tr|td|th|table|tbody)|\/(?:a|b|i|u))(?=\s|$)|\b(?:class|style|href|src)=\s*\S*/gi

// A sentence end before a bullet cuts before the dash, so a unit can still
// open with its bullet mark; it is dropped here.
const LEAD = /^[-*•▪●\u2013\u2014]\s*/

export const units = (text) => String(text || '').replace(RESIDUE, ' ').replace(/[^\S\n]+/g, ' ')
  .split(EDGE).map((u) => u.trim().replace(LEAD, '')).filter((u) => u.length > 1)

export function headingOf(unit) {
  const u = unit.replace(/^[^A-Za-z]+/, '')
  for (const [section, re] of HEADINGS) {
    if (re.test(u)) return { section, weak: WEAK.test(u) && u.split(/\s+/).length > 8 }
  }
  // A short all-capitals unit is a heading this list does not know.
  if (u.length < 40 && /^[A-Z &/]+:?$/.test(u.trim())) return { section: 'other', weak: false }
  return null
}

// Before any heading, a unit that names the company and does not speak to
// the reader is the company describing itself ("Supabase is the Postgres
// platform"), not the role.
function aboutCompany(unit, own) {
  if (YOU_CUE.test(unit)) return false
  if (ABOUT_CUE.test(unit)) return true
  if (!own) return false
  own.lastIndex = 0
  return own.test(unit)
}

export function sectionize(text, company = '') {
  const own = companyPattern(company)
  let current = 'intro'
  return units(text).map((unit) => {
    const head = headingOf(unit)
    let section = current
    if (head && !head.weak) current = section = head.section
    else if (head && ['intro', 'other', 'about'].includes(current)) section = head.section
    if (section === 'intro' && aboutCompany(unit, own)) section = 'about'
    if (['req', 'resp', 'intro', 'other'].includes(section) && NICE_CUE.test(unit)) section = 'nice'
    return { text: unit, section }
  })
}
