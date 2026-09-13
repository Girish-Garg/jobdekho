import { contextAt } from './flag-context.js'

// Rule 3 of the fact check, the names half: a capitalised phrase in the
// rewrite that the original never has. Employers, institutions and titles
// are written that way, and the model cannot invent one without producing
// such a phrase.
//
// The naive form of this rule (any run of capitalised words absent from the
// original) was measured on a realistic honest rewrite and flagged 12
// phrases, all false: an employer line "Software Developer, Infobeans
// Technologies, Pune (Jul 2023" read as one run, and "Cut API" and
// "Designed REST APIs" are a bullet's opening verb plus an acronym. Three
// refinements took it to 0 false flags on that rewrite while still catching
// an upgraded title, a new employer and a new institute: runs are cut at any
// punctuation, a run that opens a sentence is judged without its first word,
// and a phrase counts as new only if at least one of its words appears
// nowhere in the original. The cost of the last one is a name recombined
// from words the original already has ("Indian Institute of Technology" from
// "Indian Institute of Science" and "Bachelor of Technology"), which slips
// through; the title-word rule in resume-titles.js covers part of that gap.

// Small words that sit inside a name without ending it.
const CONNECT = new Set(['of', 'and', 'for', 'the', '&'])
// A capitalised word, with the dots of "B.Tech" and "Node.js" allowed inside.
const CAP = /^[A-Z][A-Za-z0-9+#'-]*(?:\.[A-Za-z0-9+#]+)*$/
// A run is what sits between punctuation marks; those mark a run's end.
const TOKEN = /([(["'|]*)([^\s]*?)([.,;:!?)\]"'|]*)(?=\s|$)/g

const HEADINGS = new Set([
  'summary', 'skills', 'experience', 'projects', 'education', 'certifications', 'achievements',
  'internships', 'technical skills', 'work experience', 'professional summary', 'professional experience',
  'key skills', 'core competencies', 'objective', 'contact', 'publications', 'awards', 'languages', 'interests',
])

const isName = (words) => words.filter((w) => !CONNECT.has(w.toLowerCase())).length >= 2

// The capitalised runs of one line: the words, where the run starts, whether
// it opens a sentence and whether it labels a list ("Tools:"). A bullet
// opens with a verb, so its first run opens a sentence; any other line opens
// with what it is about (an employer, a project), and that is a name.
function runsOf(line, bullet) {
  const runs = []
  let run = []
  let start = 0
  let opensSentence = bullet
  let runOpens = false
  const close = (label) => {
    if (isName(run)) runs.push({ words: run, index: start, opensSentence: runOpens, label })
    run = []
  }
  for (const m of line.matchAll(TOKEN)) {
    const [, lead, word, trail] = m
    if (lead) close(false)
    if (!word) continue
    if (CAP.test(word) || (run.length && CONNECT.has(word.toLowerCase()))) {
      if (!run.length) {
        start = m.index + lead.length
        runOpens = opensSentence
      }
      run.push(word)
    } else close(false)
    if (trail) close(trail.startsWith(':'))
    opensSentence = /[.!?]/.test(trail) || (!run.length && /:/.test(trail))
  }
  close(false)
  return runs
}

const wordsOf = (text) => new Set(text.toLowerCase().match(/[a-z0-9+#]+(?:\.[a-z0-9+#]+)*/g) || [])
const flat = (words) => words.join(' ').toLowerCase()

export function checkNames(original, tailored) {
  const known = wordsOf(original)
  const haystack = original.toLowerCase().replace(/\s+/g, ' ')
  const flags = []
  let offset = 0
  for (const line of tailored.split('\n')) {
    const body = line.replace(/^[\s\-*•]+/, '')
    const at = offset + (line.length - body.length)
    if (!HEADINGS.has(body.trim().toLowerCase())) {
      for (const run of runsOf(body, /^\s*[-*•]/.test(line))) {
        if (run.label) continue
        const judged = run.opensSentence ? run.words.slice(1) : run.words
        const isNew = isName(judged) && !haystack.includes(flat(judged))
          && judged.some((w) => !CONNECT.has(w.toLowerCase()) && !known.has(w.toLowerCase()))
        if (isNew) flags.push({ type: 'name', value: run.words.join(' '), context: contextAt(tailored, at + run.index) })
      }
    }
    offset += line.length + 1
  }
  return flags
}
