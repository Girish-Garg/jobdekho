# Model card

JobDekho has three small word models. They run on the person's own computer in plain JavaScript, and only where the step 1 rules found no evidence. The maintainer trains them with `npm run train:model` (scripts/model), which writes the weights, the measurements in scripts/model/metrics, and this card. The numbers below are generated; edit scripts/model/card*.js, not this file.

## How a claim is proved

- Held out: every model is tested on companies it never saw, and its thresholds are set for about 99.5% precision there, so that the owner's check passes reliably.
- The owner's check: `npm run review:model -- sections` (or `facts`) opens a local page with up to 250 of the model's real outputs, drawn once and kept, spread across companies (`--draw-only` draws them and leaves). Each shows the posting, the output, the words that pushed it, and Claude's pre-check when there is one. The owner marks each right or wrong.
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

## Facts model

- Status: shipped, but off in the app until the owner's audit of this version passes.
- What it does: reads each line of a description and says which fact it states, if any: a pre-placement offer, shifts or working hours, an early start, an address to send the resume to. It runs only where the plain readers (core's description-facts.js) found that fact in no line, and it never replaces theirs. What a picked line states is read by core's fact-values.js, which also refuses a line that states no usable value ("Permanent" alone, "Letter of recommendation based on performance", "Shift timings:" with the hours on the next line, daytime hours). Its facts say they were the model's.
- Version: 1
- Weights: 4,899 features, 195 KB.
- Labels: no posting labels these facts, so the maintainer's corpus was read by hand. Every line a candidate word picks out (scripts/model/fact-data.js) was labelled with the fact it states or none, kept in scripts/model/labels/facts.json by the line's fingerprint, never its text. Labelled: ppo 42, shift 253, start 15, email 17, none 9,314, from 11,027 postings at 630 companies (postings.ndjson saved 2026-10-06 (7,947 rows, 7,947 not in an earlier file); postings.ndjson saved 2026-09-30 (8,762 rows, 3,770 not in an earlier file)); the none count includes a sample of the lines no candidate word picks out. Candidate lines still unlabelled: 0. Lines the weights would show in the app that no one has read: 0.
- Archive: the app deletes a posting once it closes, or two months after it was posted or last listed, and a fingerprint alone cannot find a line it no longer holds. So every candidate line, labelled line and line the weights show is kept as text in scripts/model/data/facts/lines.ndjson on the maintainer's computer (git ignores it: it holds posting text), and training reads its labelled lines from there. It holds 1,641 lines; 0 labelled lines are trained on from it alone, their postings gone. Each training run adds what the corpus holds, and `npm run keep:lines` does it between runs.
- Written examples: ppo 38, shift 5, start 13, email 8, none 38, sentences written by hand (scripts/model/labels/facts-written.json) for wordings the corpus has too few of. They are trained on in every fold and never measured.
- Openings and bonds are stated in too few lines to learn, and stay the plain readers' alone.
- Features: the line's words and word pairs and its first word, with an email address as the kind of address it is (an applying desk, a help desk, a personal mailbox, any other), a clock time, a round-the-clock and a link as one word each.
- Split: by company, 5 folds (seed 20261004); every number below is out of fold, on the compacted weights as shipped, and counts a line as shown only when its value reads, as in the app.
- Calibration: temperature 1.0585.
- Thresholds: one per fact, as for the section model, with at least 15 lines covered.

### At the shipped target, 99.0% precision

Held out: 102 right of 102 shown (100.00%). With each fold's thresholds chosen on the other folds: 107 of 108 (99.07%).

| Fact | Threshold | Shown, right | Lines stating it | Rules find | Model finds | Either finds |
|---|---|---|---|---|---|---|
| Pre-placement offer | 0.5 | 30 of 30 | 42 | 21.4% | 71.4% | 76.2% |
| Shifts and hours | 0.93 | 72 of 72 | 253 | 19.0% | 28.5% | 39.5% |
| Early start | never shown | none | 15 | 33.3% | 0.0% | 33.3% |
| Address to apply to | never shown | none | 17 | 100.0% | 0.0% | 100.0% |

### Trade-off

At a 95% target: 156 right of 159 shown (98.11%; 95.18% with thresholds chosen on the other folds).

| Fact | Threshold | Shown, right | Lines stating it | Rules find | Model finds | Either finds |
|---|---|---|---|---|---|---|
| Pre-placement offer | 0.5 | 30 of 30 | 42 | 21.4% | 71.4% | 76.2% |
| Shifts and hours | 0.6 | 126 of 129 | 253 | 19.0% | 49.8% | 55.3% |
| Early start | never shown | none | 15 | 33.3% | 0.0% | 33.3% |
| Address to apply to | never shown | none | 17 | 100.0% | 0.0% | 100.0% |

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
