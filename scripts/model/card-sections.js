import { pct, count, table, filesLine, audit, groupRows } from './card-parts.js'

// The section model's part of the model card, from its metrics.
export function sectionsCard(m, record) {
  const c = m.chosen
  const a = m.alternative
  const d = m.data
  const u = m.unheaded
  return `## Section model

- What it does: for a posting whose text has no heading step 1 reads (its sections are null), it sorts each sentence or bullet into duties, requirements, pay, about or other; a requirement marked optional ("is a plus") becomes nice to have by step 1's own rule. A line goes to a section only when the model clears that section's threshold; every other line stays "other", in the posting's order. The sections are marked from: 'model'.
- Version: ${m.version}
- Weights: ${count(m.training.kept)} features, ${(m.weightsBytes / 1024).toFixed(0)} KB.
- Trained on: ${count(d.trainedOn)} lines from ${count(d.headedPostings)} postings whose headings step 1 understood, from ${count(d.companies)} companies (${filesLine(d.files)}). Lines: ${Object.entries(d.lines).map(([k, v]) => `${k} ${count(v)}`).join(', ')}.
- Labels: a line takes the section its heading names, and only under a heading specific enough to trust ("Responsibilities", "Qualifications", "Benefits", "About us"; not "Job Description" or "The Role", which head everything). Nice to have counts as requirements, since only its heading tells them apart. A line asking for years or a degree counts as a requirement wherever it sits; a line opening with a duty ("Design...", "Collaborate...") under any other heading is left out, in training and testing alike, since its heading is more likely wrong than the line. Duties and requirements come only from postings that head both. "How to apply" headed too few lines to learn.
- Features: the line's words and word pairs, its first word, length, whether it is a list item, its place in the posting, and the words of the lines before and after it. The headings themselves are left out.
- Split: by company, ${m.split.folds} folds (seed ${m.split.seed}); every number below is out of fold, on the compacted weights as shipped.
- Calibration: temperature ${m.temperature}.
- Thresholds: one per section, chosen as for the level model (fixed grid, strict to lenient, at least ${m.minSupport} lines covered).

### At the shipped target, ${pct(c.target)} precision

Held out: ${count(c.heldOut.covered)} of ${count(m.heldOut.lines)} lines placed (${pct(c.heldOut.coverage)}), ${pct(c.heldOut.precision, 2)} in the section their heading named. With each fold's thresholds chosen on the other folds: ${pct(c.thresholdsChosenWithoutTheTestFold.precision, 2)} of ${count(c.thresholdsChosenWithoutTheTestFold.covered)}. The misses that remain at the top are mostly lines whose heading was wrong, not the model; the precision is measured against headings all the same.

${table(['Section', 'Threshold', 'Held out placed', 'Precision'], groupRows(c.byKind))}

On the postings it is for, the ${count(u.postings)} with at least 300 characters and no heading: ${count(u.sorted)} get model sections (${pct(u.sortedShare)}); ${count(u.placedLines)} of their ${count(u.lines)} lines are placed (${pct(u.placedShare)}): ${Object.entries(u.placed).map(([k, v]) => `${k} ${count(v)}`).join(', ')}. The rest stay "other".

### Trade-off

At a ${pct(a.target, 0)} target: ${count(a.heldOut.covered)} held-out lines placed (${pct(a.heldOut.coverage)}), ${pct(a.heldOut.precision, 2)} precise (${pct(a.thresholdsChosenWithoutTheTestFold.precision, 2)} with thresholds chosen on the other folds).

${table(['Section', 'Threshold', 'Held out placed', 'Precision'], groupRows(a.byKind))}

${table(['One threshold for all', 'Lines placed', 'Precision', 'Wrong'], m.globalThresholds.map((g) => [String(g.threshold), pct(g.coverage), pct(g.precision, 2), count(g.wrong)]))}

${audit(record)}
`
}
