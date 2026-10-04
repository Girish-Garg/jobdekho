import { pct, count, table, filesLine, audit, groupRows } from './card-parts.js'

// Why a model is or is not in the package, in the card's words.
function status(m) {
  if (m.shipped !== false) return 'shipped'
  const reason = m.chosen.unknown.covered === 0 ? ': no unknown posting reaches the bar' : ''
  return `not shipped${reason}. Its weights stay out of the package, and training writes them to scripts/model/data/unshipped for study`
}

// The level range model's part of the model card, from its metrics.
export function levelCard(m, record) {
  const c = m.chosen
  const a = m.alternative
  const d = m.data
  return `## Level range model

- Status: ${status(m)}.
- What it does: for a posting whose level step 1 found no evidence for, and which has at least ${m.training.minWords} words of its own text, it estimates a range of two adjacent levels ("~Mid to Senior"). It never gives one level, never overrides stated evidence, and abstains unless the pair clears its threshold.
- Version: ${m.version}
- Weights: ${count(m.training.kept)} features, ${(m.weightsBytes / 1024).toFixed(0)} KB.
- Trained on: ${count(d.trainedOn)} postings with a level step 1 found (tag version ${d.tagsVersion}) and enough text, from ${count(d.companies)} companies, out of ${count(d.postings)} distinct public postings (${filesLine(d.files)}). Levels: ${Object.entries(d.levels).map(([k, v]) => `${k} ${count(v)}`).join(', ')}. Where the level came from: ${Object.entries(d.levelFrom).map(([k, v]) => `${k} ${count(v)}`).join(', ')}.
- Features: title words and pairs, the company, and description words and pairs, with every word the step 1 rules read taken out (the title's level words, sentences stating years, any sentence naming an internship or traineeship), so the model learns from the other clues. Those are the words step 1 read at tag version ${d.tagsVersion}; training refuses to run on newer tags until the words their rules read are hidden too.
- Split: by company, ${m.split.folds} folds (seed ${m.split.seed}); no company is on both sides. Every number below is out of fold, on the compacted weights as they would ship.
- Calibration: temperature ${m.temperature}, fitted on the out-of-fold scores.
- Thresholds: one per pair, the most lenient point of a fixed grid, walked from strict to lenient, before held-out precision first drops under the target (at least ${m.minSupport} postings covered).

### At the target, ${pct(c.target)} precision

Held out: ${count(c.heldOut.covered)} of ${count(m.heldOut.postings)} postings shown a range (${pct(c.heldOut.coverage)}), ${pct(c.heldOut.precision, 2)} of them holding the level step 1 found. With each fold's thresholds chosen on the other folds: ${pct(c.thresholdsChosenWithoutTheTestFold.precision, 2)} of ${count(c.thresholdsChosenWithoutTheTestFold.covered)}. On held-out postings whose title said nothing (the ones most like those the model is used on): ${pct(c.heldOutTitleSaidNothing.precision, 2)} of ${count(c.heldOutTitleSaidNothing.covered)}.

${table(['Pair', 'Threshold', 'Held out shown', 'Precision', 'Unknown postings shown'], groupRows(c.byPair, 'unknown'))}

Coverage on the postings step 1 left unknown: ${count(c.unknown.covered)} of ${count(d.unknown)} (${count(d.unknownWithText)} have enough text to be asked).

### Trade-off

The pairs from Entry to Mid upward never reach the target: even the most confident held-out estimates for Mid to Senior and Senior to Staff miss between one time in ten and one in twenty. Most misses sit on a boundary of years: the level the rules found came from a number of years the model is not allowed to see, and the words around it rarely tell a posting asking for 4 years from one asking for 9. So the model mostly speaks about internships and first jobs, which the postings step 1 left unknown rarely are. At a ${pct(a.target, 0)} target: ${count(a.heldOut.covered)} held out shown (${pct(a.heldOut.coverage)}), ${pct(a.heldOut.precision, 2)} precise, ${count(a.unknown.covered)} unknown postings estimated. Lower targets:

${table(['Target', 'Pairs shown', 'Held out shown', 'Precision', 'Unknown postings shown'], m.lowerTargets.map((t) => [pct(t.target, 0), Object.entries(t.thresholds).filter(([, v]) => v != null).map(([k]) => k.replace('-', ' to ')).join(', ') || 'none', count(t.heldOut.covered), pct(t.heldOut.precision), count(t.unknown.covered)]))}

One threshold for every pair at once. Pooled, the many sure internships hide how the other pairs do, and the unknown postings it would estimate are mostly Mid to Senior and Senior to Staff at companies the model trained on, where it leans on the company itself: held-out testing, by design, cannot check that.

${table(['Threshold', 'Held out shown', 'Precision', 'Wrong', 'Unknown shown', 'Of those, pairs', 'At companies trained on'], m.globalThresholds.map((g) => [
    String(g.threshold), pct(g.heldOutCoverage), pct(g.precision, 2), count(g.wrong), `${count(g.unknownCovered)} (${pct(g.unknownCoverage)})`,
    Object.entries(g.unknownByPair ?? {}).map(([k, v]) => `${k.replace('-', ' to ')} ${v}`).join(', ') || 'none', count(g.unknownAtTrainedCompanies),
  ]))}

${audit(record)}
`
}
