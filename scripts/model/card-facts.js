import { pct, count, table, filesLine, audit } from './card-parts.js'

const NAMES = { ppo: 'Pre-placement offer', shift: 'Shifts and hours', start: 'Early start', email: 'Address to apply to' }

// Per fact, held out: the threshold, what the model showed and how much of
// it was right, and of the lines stating the fact, the share the plain
// readers find alone, the model alone, and the two together.
function factRows(byKind) {
  return Object.entries(byKind).map(([kind, k]) => [
    NAMES[kind] ?? kind,
    k.threshold == null ? 'never shown' : String(k.threshold),
    k.covered ? `${count(k.right)} of ${count(k.covered)}` : 'none',
    count(k.stated),
    pct(k.rules),
    pct(k.model),
    pct(k.either),
  ])
}

// The facts model's part of the model card, from its metrics.
export function factsCard(m, record) {
  const c = m.chosen
  const a = m.alternative
  const d = m.data
  const on = record?.passed ? 'shipped, and on in the app: the owner\'s audit of this version passed' : 'shipped, but off in the app until the owner\'s audit of this version passes'
  const head = ['Fact', 'Threshold', 'Shown, right', 'Lines stating it', 'Rules find', 'Model finds', 'Either finds']
  return `## Facts model

- Status: ${on}.
- What it does: reads each line of a description and says which fact it states, if any: a pre-placement offer, shifts or working hours, an early start, an address to send the resume to. It runs only where the plain readers (core's description-facts.js) found that fact in no line, and it never replaces theirs. What a picked line states is read by core's fact-values.js, which also refuses a line that states no usable value ("Permanent" alone, "Letter of recommendation based on performance", "Shift timings:" with the hours on the next line, daytime hours). Its facts say they were the model's.
- Version: ${m.version}
- Weights: ${count(m.training.kept)} features, ${(m.weightsBytes / 1024).toFixed(0)} KB.
- Labels: no posting labels these facts, so the maintainer's corpus was read by hand. Every line a candidate word picks out (scripts/model/fact-data.js) was labelled with the fact it states or none, kept in scripts/model/labels/facts.json by the line's fingerprint, never its text. Labelled: ${Object.entries(d.lines).map(([k, v]) => `${k} ${count(v)}`).join(', ')}, from ${count(d.postings)} postings at ${count(d.companies)} companies (${filesLine(d.files)}); the none count includes a sample of the lines no candidate word picks out. Candidate lines still unlabelled: ${count(d.unlabelled)}. Lines the weights would show in the app that no one has read: ${count(d.unreviewedShown)}.
- Archive: the app deletes a posting once it closes, or two months after it was posted or last listed, and a fingerprint alone cannot find a line it no longer holds. So every candidate line, labelled line and line the weights show is kept as text in scripts/model/data/facts/lines.ndjson on the maintainer's computer (git ignores it: it holds posting text), and training reads its labelled lines from there. It holds ${count(d.archived)} lines; ${count(d.labelledGone)} labelled lines are trained on from it alone, their postings gone. Each training run adds what the corpus holds, and \`npm run keep:lines\` does it between runs.
- Written examples: ${Object.entries(d.written).map(([k, v]) => `${k} ${count(v)}`).join(', ')}, sentences written by hand (scripts/model/labels/facts-written.json) for wordings the corpus has too few of. They are trained on in every fold and never measured.
- Openings and bonds are stated in too few lines to learn, and stay the plain readers' alone.
- Features: the line's words and word pairs and its first word, with an email address as the kind of address it is (an applying desk, a help desk, a personal mailbox, any other), a clock time, a round-the-clock and a link as one word each.
- Split: by company, ${m.split.folds} folds (seed ${m.split.seed}); every number below is out of fold, on the compacted weights as shipped, and counts a line as shown only when its value reads, as in the app.
- Calibration: temperature ${m.temperature}.
- Thresholds: one per fact, as for the section model, with at least ${m.minSupport} lines covered.

### At the shipped target, ${pct(c.target)} precision

Held out: ${count(c.heldOut.right)} right of ${count(c.heldOut.covered)} shown (${pct(c.heldOut.precision, 2)}). With each fold's thresholds chosen on the other folds: ${count(c.thresholdsChosenWithoutTheTestFold.right)} of ${count(c.thresholdsChosenWithoutTheTestFold.covered)} (${pct(c.thresholdsChosenWithoutTheTestFold.precision, 2)}).

${table(head, factRows(c.byKind))}

### Trade-off

At a ${pct(a.target, 0)} target: ${count(a.heldOut.right)} right of ${count(a.heldOut.covered)} shown (${pct(a.heldOut.precision, 2)}; ${pct(a.thresholdsChosenWithoutTheTestFold.precision, 2)} with thresholds chosen on the other folds).

${table(head, factRows(a.byKind))}

${audit(record)}
`
}
