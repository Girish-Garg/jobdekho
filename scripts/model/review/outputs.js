import { estimateLevel } from '@jobdekho/core/model/level-estimate.js'
import { scoreLines } from '@jobdekho/core/model/section-estimate.js'
import { placedKinds, sortedSections } from '@jobdekho/core/model/model-sections.js'
import { sortableUnits } from '@jobdekho/core/model/section-lines.js'
import { postingSections } from '@jobdekho/core/jd-layout.js'
import { shippedModel } from '@jobdekho/core/model/weights.js'
import { descriptionFacts, linesOf } from '@jobdekho/core/description-facts.js'
import { modelFacts } from '@jobdekho/core/model/model-facts.js'

// Every output the shipped model would show on these postings, as the
// review page needs it: { id, postingId, company, companyKey, title,
// source, text, group, output, confidence, words, evidence, line }. Only
// what a person would see counts: an estimate that clears its threshold,
// a line placed in a section of a posting the pane would lay out by the
// model, both made by the same code the app runs. `group` is what the
// sample is spread over.
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
    if (!p.description || postingSections(p.description, { company: p.company })) continue
    if (!sortedSections(p.description, { model })) continue
    const { lines, under } = sortableUnits(p.description)
    const scored = scoreLines(lines, model)
    placedKinds(lines, model, under).forEach((kind, i) => {
      if (kind === 'other') return
      const { confidence, words } = scored[i]
      out.push({ id: `sections:${p.id}:${i}`, ...posting(p), group: kind, output: kind, confidence, words, evidence: `Placed by: ${words.map((w) => `'${w}'`).join(', ')}`, line: lines[i].replace(/^- /, '') })
    })
  }
  return out
}

// Every fact the list above a description would show with the facts model
// on: the plain readers' and the model's additions, since the audit is of
// the list a person sees. `group` is the fact and who read it, so the
// sample spreads over both. A plain reader's line is the one its evidence
// quotes, cut or whole.
const FACT_NAMES = { ppo: 'Pre-placement offer', email: 'Apply by email', openings: 'Openings', bond: 'Bond', start: 'Start', shift: 'Shift' }
const quoted = (evidence) => /^Says "(.*?)(?:\.\.\.)?"$/.exec(evidence ?? '')?.[1] ?? null

function factOutputs(postings) {
  const model = shippedModel('facts')
  const out = []
  for (const p of postings) {
    const ruled = descriptionFacts(p.description, { model: null })
    const added = modelFacts(linesOf(p.description), model)
    for (const [kind, name] of Object.entries(FACT_NAMES)) {
      const byModel = !ruled[kind] && added[kind]
      const fact = ruled[kind] ?? added[kind]
      if (!fact) continue
      out.push({
        id: `facts:${p.id}:${kind}`, ...posting(p), group: `${kind}:${byModel ? 'model' : 'rule'}`, output: `${name}: ${fact.value}`,
        confidence: byModel ? fact.confidence : null, words: byModel ? fact.words : [], evidence: fact.evidence, line: byModel ? fact.line : quoted(fact.evidence),
      })
    }
  }
  return out
}

export const OUTPUTS = { level: levelOutputs, sections: sectionOutputs, facts: factOutputs }
