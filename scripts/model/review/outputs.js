import { estimateLevel } from '@jobdekho/core/model/level-estimate.js'
import { scoreLines } from '@jobdekho/core/model/section-estimate.js'
import { sortableLines, placedKinds } from '@jobdekho/core/model/model-sections.js'
import { postingSections } from '@jobdekho/core/jd-layout.js'
import { shippedModel } from '@jobdekho/core/model/weights.js'

// Every output the shipped model shows on these postings, as the review
// page needs it: { id, postingId, company, companyKey, title, source, text,
// group, output, confidence, words, evidence, line }. Only what a person
// would see counts: an estimate that clears its threshold, a line placed
// in a section, both made by the same code the app runs. `group` is what
// the sample is spread over.
const posting = (p) => ({ postingId: p.id, company: p.company, companyKey: p.companyKey, title: p.title, source: p.source, text: p.description })

function levelOutputs(postings) {
  const out = []
  for (const p of postings) {
    if (p.level) continue
    const e = estimateLevel({ title: p.title, company: p.company, description: p.description })
    if (!e) continue
    out.push({ id: `level:${p.id}`, ...posting(p), group: e.range.join('-'), output: `~${e.range.join(' to ')}`, confidence: e.confidence, words: e.words, evidence: e.evidence, line: null })
  }
  return out
}

function sectionOutputs(postings) {
  const model = shippedModel('sections')
  const out = []
  for (const p of postings) {
    if (p.description.length < 300 || postingSections(p.description, { company: p.company })) continue
    const lines = sortableLines(p.description)
    const kinds = placedKinds(lines, model)
    const scored = scoreLines(lines, model)
    kinds.forEach((kind, i) => {
      if (kind === 'other') return
      const { confidence, words } = scored[i]
      out.push({ id: `sections:${p.id}:${i}`, ...posting(p), group: kind, output: kind, confidence, words, evidence: `Placed by: ${words.map((w) => `'${w}'`).join(', ')}`, line: lines[i].replace(/^- /, '') })
    })
  }
  return out
}

export const OUTPUTS = { level: levelOutputs, sections: sectionOutputs }
