// Threshold menus for the three numeric refinements. Shared by the selects and
// by the active-filter chips so the two cannot drift apart. The labels read
// standalone because a chip is shown without its caption.
// Pay is stored normalised to monthly rupees so an internship stipend and an
// annual salary compare on one scale. The ladder therefore has to span both:
// it used to stop at 15,000/mo, which is 1.8 LPA, so every actual job landed in
// a single bucket. The LPA gloss is there because job ads are quoted that way.
export const STIPEND_RANGES = [
  ['', 'Any'],
  ['1', 'Paid only'],
  ['10000', 'Rs 10,000+ /mo'],
  ['25000', 'Rs 25,000+ /mo (3 LPA)'],
  ['50000', 'Rs 50,000+ /mo (6 LPA)'],
  ['100000', 'Rs 1,00,000+ /mo (12 LPA)'],
];

export const EXPERIENCE_RANGES = [
  ['', 'Any'],
  ['0', 'Fresher'],
  ['1', 'Max 1 year'],
  ['2', 'Max 2 years'],
  ['3', 'Max 3 years'],
  ['5', 'Max 5 years'],
];

export const DURATION_RANGES = [
  ['', 'Any'],
  ['1', 'Max 1 month'],
  ['2', 'Max 2 months'],
  ['3', 'Max 3 months'],
  ['6', 'Max 6 months'],
];

// Fit is the server's 0-100 score of a posting against the profile, but the
// scale tops out low in practice: measured on 1485 postings, nothing scored
// above 63, because a perfect score needs every dimension perfect and real
// postings never are. So the rungs sit where the feed actually thins - about
// a third of it clears 30, the strongest few percent clear 45 - and they are
// words, not numbers, so recalibrating them later cannot turn the copy into
// a lie.
export const FIT_RANGES = [
  ['', 'Any'],
  ['30', 'Good fit'],
  ['45', 'Strong fit'],
];
