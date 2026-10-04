import { HEADINGS, WEAK } from './jd-headings.js'
import { sectionize } from './jd-sections.js'

// A description as the sections a person reads it by, for the job pane:
//
//   [{ kind, heading, lines, boilerplate }]
//
// kind is duties, requirements, nice, pay, apply, about or other; heading
// is the posting's own words for it, or null; lines are its stored lines in
// order. Sections come in reading order (what you will do, what they want,
// nice to have, pay and perks, how to apply, about the company), after any
// opening summary. null when the text has no heading at all: such a posting
// keeps the layout it has until sentences can be sorted without headings.
const KIND = { resp: 'duties', req: 'requirements', nice: 'nice', benefits: 'pay', apply: 'apply', about: 'about', eeo: 'other', other: 'other' }
const ORDER = ['duties', 'requirements', 'nice', 'pay', 'apply', 'about', 'other']

// "About Acme" on a line of its own heads the company's own copy.
const ABOUT_LINE = /^about\s+[^.!?]{2,40}$/i

// A line is a heading when it is short and either is a known heading
// phrase, ends in a colon, or is in capitals. "Experience with Kafka" opens
// like a heading and is a bullet, so the words that also open bullets count
// only alone or before a colon.
export function headingLine(line) {
  const text = line.replace(/^[-*•\s]+/, '').trim()
  if (!text || text.length > 60 || text.split(/\s+/).length > 8) return null
  const colon = /:$/.test(text)
  const caps = /^[A-Z][A-Z &/'’-]+:?$/.test(text)
  if (!colon && text.split(/\s+/).length <= 5 && ABOUT_LINE.test(text) && !/^about the (?:job|role|position|opportunity)\b/i.test(text)) {
    return { kind: 'about', heading: text }
  }
  for (const [section, re] of HEADINGS) {
    const m = re.exec(text)
    if (!m) continue
    const rest = text.slice(m[0].length).replace(/[:\s]+$/, '').trim()
    const restWords = rest ? rest.split(/\s+/).length : 0
    if (colon || caps || (WEAK.test(text) ? restWords === 0 : restWords <= 3)) return { kind: KIND[section], heading: text.replace(/:$/, '') }
    return null
  }
  return caps ? { kind: 'other', heading: text.replace(/:$/, '') } : null
}

// Equal-opportunity text, wherever it sits: it folds under "Show company
// text" and is never deleted.
const EEO = /equal (?:employment )?opportunit|without regard to|\beeo\b|affirmative action|reasonable accommodation|protected (?:veteran|characteristic|status)/i
// Company template text folds the same way, but never out of what the job
// asks or does: a requirement a company repeats in every ad is still one.
const FOLDABLE = new Set(['pay', 'apply', 'about', 'other'])

function runs(section, isTemplate) {
  const flag = (line) => (EEO.test(line) ? 'eeo' : FOLDABLE.has(section.kind) && isTemplate(line) ? 'template' : null)
  const out = []
  for (const line of section.lines) {
    const kind = flag(line)
    const last = out.at(-1)
    if (last && last.flag === kind) last.lines.push(line)
    else out.push({ flag: kind, lines: [line] })
  }
  return out.map((run, i) => ({
    kind: run.flag === 'eeo' ? 'other' : section.kind,
    heading: i === 0 ? section.heading : null,
    lines: run.lines,
    boilerplate: Boolean(run.flag),
  }))
}

// The opening lines, before any heading: the company's pitch when the
// sectioniser reads every one of them as about the company, else a summary.
function opening(lines, company) {
  const units = sectionize(lines.join('\n'), company)
  return units.length && units.every((u) => u.section === 'about') ? 'about' : 'other'
}

export function postingSections(text, { company = '', isTemplate = () => false } = {}) {
  const sections = [{ kind: null, heading: null, lines: [] }]
  for (const line of String(text || '').split('\n').map((l) => l.trim()).filter(Boolean)) {
    const head = headingLine(line)
    if (head) sections.push({ ...head, lines: [] })
    else sections.at(-1).lines.push(line)
  }
  if (sections.length === 1) return null
  const [first, ...rest] = sections
  const top = first.lines.length ? [{ ...first, kind: opening(first.lines, company) }] : []
  return inReadingOrder([...top, ...rest], { isTemplate, opens: top.length > 0 })
}

// Sections, each split where equal-opportunity or template text starts, in
// reading order after the opening summary, when `opens` says the first one
// is that summary. The small model's sections are laid out by the same
// steps (model/model-sections.js), so both read alike in the pane.
export function inReadingOrder(sections, { isTemplate = () => false, opens = false } = {}) {
  // A heading with nothing under it (one heading straight after another)
  // says nothing a reader can use.
  const all = sections.flatMap((s) => runs(s, isTemplate))
  const lead = opens && all[0]?.kind === 'other' && !all[0].boilerplate ? [all.shift()] : []
  const rank = (s) => ORDER.indexOf(s.kind) + (s.boilerplate ? 0.5 : 0)
  return [...lead, ...all.map((s, i) => ({ s, i })).sort((a, b) => rank(a.s) - rank(b.s) || a.i - b.i).map(({ s }) => s)]
}
