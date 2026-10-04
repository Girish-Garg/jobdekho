import { headingLine } from '@jobdekho/core/jd-layout.js'
import { units } from '@jobdekho/core/model/tokens.js'
import { lineFeatures } from '@jobdekho/core/model/section-features.js'
import { foldOf } from './random.js'

// What the section model learns from: the lines of postings whose headings
// step 1 understood, each labelled with the section its heading names, with
// the headings themselves left out. Nice-to-haves read like requirements
// and only their heading tells them apart, so they count as requirements
// here; core marks the optional ones by their own words. "How to apply"
// headed four lines in ten thousand postings, too few to learn.
export const SECTION_KINDS = ['duties', 'requirements', 'pay', 'about', 'other']
const MERGED = { nice: 'requirements' }

// Only headings this specific label their lines: "Job Description" or "The
// Role" head everything from duties to benefits, and "About you" is a
// requirements heading that step 1 files under the company.
const SPECIFIC = {
  duties: /^(?:(?:key|core|job|principal|major|primary) )?(?:responsibilit|accountabilit|duties)|^roles? (?:and |& )?responsibilit|^what you(?:'|\s)?(?:ll|will)? ?(?:be )?do|^in this role|^your (?:role|responsibilities|impact|mission|day)|^you will\b|^you'?ll\b|^day[- ]to[- ]day/,
  requirements: /^(?:(?:required|minimum|basic|key|technical|educational|mandatory|must[- ]?have) )?(?:qualifications?|requirements?|skills?)\b|^what you(?:'|\s)?(?:ll|will)? ?(?:need|bring)|^what (?:we|we're|were|we are) looking for|^who (?:we're|were|we are) looking for|^who you are|^your (?:profile|background|experience|skills)|^must[- ]?have|^mandatory|^education|^experience\b|^you have|^(?:the )?ideal candidate|^eligibility|^desired candidate/,
  nice: /^(?!preferred locations)/,
  pay: /benefit|perk|what we offer|we offer|in it for you|compensation|salary|reward|why join|why you'?ll love/,
  about: /^about (?!you\b|this role|the role|the team|this opportunity|the job|the position|the opportunity)|^who we are|^company (?:overview|description)|^our (?:mission|story|culture|values|company)|^why (?!join|you|this)/,
  other: /equal|eeo|disclaimer|privacy|diversity|accommodation|fraud|beware/,
}
const named = (heading) => heading.toLowerCase().replace(/’/g, "'").replace(/[^a-z' &]/g, ' ').replace(/\s+/g, ' ').trim()
function labelOf(head) {
  const name = named(head.heading)
  if (/^about you\b/.test(name)) return 'requirements'
  return SPECIFIC[head.kind]?.test(name) ? MERGED[head.kind] ?? head.kind : null
}

// A short line step 1 does not take for a heading but a reader would
// ("Additional Information:", "Who You'll Work With") ends the section
// above it: what follows is not that section's.
const UNKNOWN_HEADING = (line) => line.split(/\s+/).length <= 7 && !/[.;,]$/.test(line) && (/:$/.test(line) || /^[A-Z][^.!?]*$/.test(line))

// A line asking for years or a degree, or opening the way requirements do,
// is a requirement even when a duties heading sits over it.
const REQ_CUE = /\d\s*\+?\s*(?:(?:to|-|\u2013)\s*\d+\s*)?(?:years?|yrs?)\b|\b(?:bachelor|master|b\.?\s?tech|m\.?\s?tech|degree|graduate in|phd)\b|^(?:(?:strong|solid|good|deep|proven|hands-on|working|excellent|sound|basic|prior) )?(?:experience\b|knowledge of|familiarity with|proficiency\b|understanding of|expertise (?:in|with)|exposure to|communication skills|track record|ability to|comfortable (?:with|in))/i

// A line opening with what someone will do is a duty, whatever heading
// sits over it; under any other heading its label is left out rather than
// trusted, in training and in testing alike.
const DUTY_CUE = /^(?:you will |you'll )?(?:develop|design|build|create|implement|maintain|manage|lead|drive|own|ensure|support|collaborate|partner|work|participate|contribute|conduct|perform|provide|define|deliver|write|test|validate|review|improve|monitor|analy[sz]e|troubleshoot|translate|configure|coordinate|identify|prepare|assist|execute|establish|oversee|mentor|guide)\b/i
const trusted = (kind, text) => (kind && kind !== 'duties' && DUTY_CUE.test(text.replace(/^- /, '')) ? null : kind)

// { lines, labels, kinds } in the cut model-sections.js makes at inference
// (a heading inside a line is left out there too), or null with no heading.
export function labelledLines(text) {
  const doc = { lines: [], labels: [], kinds: new Set() }
  const push = (unit, kind) => {
    doc.lines.push(unit.bullet ? `- ${unit.text}` : unit.text)
    doc.labels.push(kind)
    if (kind) doc.kinds.add(kind)
  }
  let current = null
  let headed = false
  for (const line of String(text || '').split('\n').map((l) => l.trim()).filter(Boolean)) {
    for (const unit of units(line)) {
      const head = headingLine(unit.text)
      if (head) {
        headed = true
        current = labelOf(head)
        // A heading of a known section is left out, as at inference; an
        // unknown one stays a line, unlabelled.
        if (head.kind !== 'other') continue
        push(unit, null)
      } else if (unit.text === line && UNKNOWN_HEADING(line)) {
        current = null
        push(unit, null)
      } else {
        push(unit, current === 'duties' && REQ_CUE.test(unit.text) ? 'requirements' : trusted(current, unit.text))
      }
    }
  }
  return headed ? doc : null
}

// Labelled lines as training examples. Duties and requirements are taken
// only from postings that head both, where a requirement is far less likely
// to sit unmarked under the duties heading.
export function sectionExamples(postings) {
  const examples = []
  for (const p of postings) {
    if (p.description.length < 300) continue
    const doc = labelledLines(p.description)
    if (!doc) continue
    const complete = doc.kinds.has('duties') && doc.kinds.has('requirements')
    doc.labels.forEach((kind, i) => {
      if (!kind || (!complete && (kind === 'duties' || kind === 'requirements'))) return
      examples.push({ id: p.id, companyKey: p.companyKey, fold: foldOf(p.companyKey), y: SECTION_KINDS.indexOf(kind), features: lineFeatures(doc.lines, i), text: doc.lines[i] })
    })
  }
  return examples
}
