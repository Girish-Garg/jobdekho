# Model card

JobDekho has two small word models. They run on the person's own computer in plain JavaScript, and only where the step 1 rules found no evidence. The maintainer trains them with `npm run train:model` (scripts/model), which writes the weights, the measurements in scripts/model/metrics, and this card. The numbers below are generated; edit scripts/model/card*.js, not this file.

## How a claim is proved

- Held out: every model is tested on companies it never saw, and its thresholds are set for about 99.5% precision there, so that the owner's check passes reliably.
- The owner's check: `npm run review:model -- sections` opens a local page with 250 of the model's real outputs, drawn once and kept, spread across companies (`--draw-only` draws them and leaves). Each shows the posting, the output, the words that pushed it, and Claude's pre-check when there is one. The owner marks each right or wrong.
- The claim is 98% precision with 95% confidence: 0 wrong in 150 checked, or at most 1 in 236. When a review is finished, its record goes into packages/core/src/model/audit.json with its one-sided 95% Clopper-Pearson lower bound, and is written below.
- A shipped model's output shows in the app only once that record is for its very version and passed; until then the model is off, and the card reads "not yet audited".
- Pre-checks are read from scripts/model/data/review/<model>/precheck.json: `{ "<sample id>": { "verdict": "right" | "wrong" | "unsure", "note": "why" } }`, empty until filled.

## Section model

- Status: shipped, but off in the app until the owner's audit of this version passes.
- What it does: for a posting whose text has no heading step 1 reads (its sections are null), it sorts each sentence or bullet into duties, requirements, pay, about or other. A line goes to a section only when the model clears that section's threshold, and only when it is section content: equal-opportunity and legal notices, heading-shaped lines and pieces broken off a sentence are never placed. A heading inside the text still counts, known to step 1 or not: under a nice-to-have heading a requirement becomes nice to have and a duty is left unsorted. Anywhere else a requirement becomes nice to have only when its own words make all of it optional ("Kafka is a plus"; not "Bachelor's degree, Master's preferred"), step 1's own rule. The lines it leaves unsorted open the posting, in its order, and the sorted sections follow, each marked from: 'model'.
- Version: 2
- Weights: 37,383 features, 1506 KB.
- Trained on: 55,681 lines from 3,056 postings whose headings step 1 understood, from 250 companies (postings.ndjson saved 2026-10-03 (6,482 rows, 6,482 not in an earlier file)). Lines: duties 23,368, requirements 22,485, pay 1,915, about 7,352, other 561.
- Labels: a line takes the section its heading names, and only under a heading specific enough to trust ("Responsibilities", "Qualifications", "Benefits", "About us"; not "Job Description" or "The Role", which head everything). Nice to have counts as requirements, since only its heading tells them apart. A line asking for years or a degree counts as a requirement wherever it sits; a line opening with a duty ("Design...", "Collaborate...") under any other heading is left out, in training and testing alike, since its heading is more likely wrong than the line. Duties and requirements come only from postings that head both. "How to apply" headed too few lines to learn.
- Features: the line's words and word pairs, its first word, length, whether it is a list item, its place in the posting, and the words of the lines before and after it. The headings themselves are left out.
- Split: by company, 5 folds (seed 20261004); every number below is out of fold, on the compacted weights as shipped.
- Calibration: temperature 1.2711.
- Thresholds: one per section, the most lenient point of a fixed grid, walked from strict to lenient, before held-out precision first drops under the target (at least 50 lines covered).

### At the shipped target, 99.5% precision

Held out: 16,984 of 55,681 lines placed (30.5%), 99.55% in the section their heading named. With each fold's thresholds chosen on the other folds: 99.46% of 16,040. The misses that remain at the top are mostly lines whose heading was wrong, not the model; the precision is measured against headings all the same.

| Section | Threshold | Held out placed | Precision |
|---|---|---|---|
| duties | 0.98 | 12,026 | 99.5% |
| requirements | 0.996 | 4,748 | 99.6% |
| pay | 0.93 | 77 | 100.0% |
| about | 0.985 | 133 | 100.0% |

On the postings it is for, the 325 with at least 300 characters and no heading: 194 get model sections (59.7%); 1,407 of their 6,208 lines are placed (22.7%): duties 1,124, about 13, requirements 255, nice 15. The rest open the posting unsorted, or fold as company text. These are what the app will show once the audit passes.

### Trade-off

At a 98% target: 34,570 held-out lines placed (62.1%), 98.22% precise (97.99% with thresholds chosen on the other folds).

| Section | Threshold | Held out placed | Precision |
|---|---|---|---|
| duties | 0.9 | 18,250 | 98.4% |
| requirements | 0.93 | 14,835 | 98.0% |
| pay | 0.93 | 77 | 100.0% |
| about | 0.93 | 1,408 | 98.2% |

| One threshold for all | Lines placed | Precision | Wrong |
|---|---|---|---|
| 0.9 | 65.6% | 97.96% | 745 |
| 0.95 | 54.9% | 98.67% | 405 |
| 0.98 | 40.4% | 99.26% | 166 |
| 0.99 | 29.9% | 99.50% | 84 |
| 0.995 | 20.4% | 99.72% | 32 |

- Audit: not yet audited.

## Level range model

- Status: not shipped: no unknown posting reaches the bar. Its weights stay out of the package, and training writes them to scripts/model/data/unshipped for study.
- What it does: for a posting whose level step 1 found no evidence for, and which has at least 60 words of its own text, it estimates a range of two adjacent levels ("~Mid to Senior"). It never gives one level, never overrides stated evidence, and abstains unless the pair clears its threshold.
- Version: 1
- Weights: 24,390 features, 1132 KB.
- Trained on: 6,156 postings with a level step 1 found (tag version 2) and enough text, from 649 companies, out of 10,128 distinct public postings (postings.ndjson saved 2026-10-03 (6,482 rows, 6,482 not in an earlier file); postings.ndjson saved 2026-10-02 (4,827 rows, 4,200 not in an earlier file)). Levels: senior 2,988, staff 1,074, mid 1,058, entry 466, internship 460, executive 110. Where the level came from: title 3,920, text 1,488, board 748.
- Features: title words and pairs, the company, and description words and pairs, with every word the step 1 rules read taken out (the title's level words, sentences stating years, any sentence naming an internship or traineeship), so the model learns from the other clues. Those are the words step 1 read at tag version 2; training refuses to run on newer tags until the words their rules read are hidden too.
- Split: by company, 5 folds (seed 20261004); no company is on both sides. Every number below is out of fold, on the compacted weights as they would ship.
- Calibration: temperature 1.1088, fitted on the out-of-fold scores.
- Thresholds: one per pair, the most lenient point of a fixed grid, walked from strict to lenient, before held-out precision first drops under the target (at least 50 postings covered).

### At the target, 99.5% precision

Held out: 321 of 6,156 postings shown a range (5.2%), 99.69% of them holding the level step 1 found. With each fold's thresholds chosen on the other folds: 99.41% of 339. On held-out postings whose title said nothing (the ones most like those the model is used on): 100.00% of 300.

| Pair | Threshold | Held out shown | Precision | Unknown postings shown |
|---|---|---|---|---|
| internship to entry | 0.9 | 321 | 99.7% | 0 |
| entry to mid | never shown | 0 | n/a | 0 |
| mid to senior | never shown | 0 | n/a | 0 |
| senior to staff | never shown | 0 | n/a | 0 |
| staff to executive | never shown | 0 | n/a | 0 |

Coverage on the postings step 1 left unknown: 0 of 1,317 (576 have enough text to be asked).

### Trade-off

The pairs from Entry to Mid upward never reach the target: even the most confident held-out estimates for Mid to Senior and Senior to Staff miss between one time in ten and one in twenty. Most misses sit on a boundary of years: the level the rules found came from a number of years the model is not allowed to see, and the words around it rarely tell a posting asking for 4 years from one asking for 9. So the model mostly speaks about internships and first jobs, which the postings step 1 left unknown rarely are. At a 98% target: 398 held out shown (6.5%), 98.99% precise, 0 unknown postings estimated. Lower targets:

| Target | Pairs shown | Held out shown | Precision | Unknown postings shown |
|---|---|---|---|---|
| 95% | internship to entry, senior to staff | 581 | 96.4% | 36 |
| 90% | internship to entry, senior to staff | 2,047 | 90.8% | 177 |

One threshold for every pair at once. Pooled, the many sure internships hide how the other pairs do, and the unknown postings it would estimate are mostly Mid to Senior and Senior to Staff at companies the model trained on, where it leans on the company itself: held-out testing, by design, cannot check that.

| Threshold | Held out shown | Precision | Wrong | Unknown shown | Of those, pairs | At companies trained on |
|---|---|---|---|---|---|---|
| 0.9 | 14.5% | 93.97% | 54 | 199 (15.1%) | mid to senior 118, senior to staff 81 | 199 |
| 0.95 | 6.3% | 98.20% | 7 | 89 (6.8%) | mid to senior 54, senior to staff 35 | 89 |
| 0.97 | 3.8% | 99.57% | 1 | 51 (3.9%) | mid to senior 26, senior to staff 25 | 51 |
| 0.98 | 2.8% | 99.42% | 1 | 26 (2.0%) | mid to senior 12, senior to staff 14 | 26 |
| 0.99 | 1.7% | 100.00% | 0 | 8 (0.6%) | mid to senior 3, senior to staff 5 | 8 |
| 0.995 | 1.0% | 100.00% | 0 | 4 (0.3%) | mid to senior 1, senior to staff 3 | 4 |

- Audit: not yet audited.
