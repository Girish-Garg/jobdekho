// The steps of the refinements in More filters and the Fit floor. Shared by
// the controls and by the active-filter chips so the two cannot drift apart,
// and mirrored by the chat's allow-lists in apps/server/src/chat/actions.js.
// The labels read standalone because a chip is shown without its caption.

// Pay is stored normalised to monthly rupees so an internship stipend and an
// annual salary compare on one scale, so the steps span both: close together
// at stipend sizes, where 5,000 a month is a real difference, and wider at
// salary sizes. The LPA gloss is there because job ads are quoted that way.
const PAY_STEPS = [5000, 10000, 15000, 20000, 25000, 35000, 50000, 75000, 100000, 150000];

function lpa(monthly) {
  const yearly = (monthly * 12) / 100000;
  return `${Number.isInteger(yearly) ? yearly : yearly.toFixed(1)} LPA`;
}

const payLabel = (n) => `₹${n.toLocaleString('en-IN')}+ /mo${n >= 20000 ? ` (${lpa(n)})` : ''}`;

export const STIPEND_RANGES = [
  ['', 'Any'],
  ['1', 'Paid only'],
  ...PAY_STEPS.map((n) => [String(n), payLabel(n)]),
];

// A ceiling, so the steps run from the tightest to none at all: a slider
// then narrows the feed as it moves left, the way the pay one widens it.
const YEARS = [1, 2, 3, 4, 5, 7, 10];
export const EXPERIENCE_RANGES = [
  ['0', 'Fresher roles only'],
  ...YEARS.map((n) => [String(n), `Up to ${n} year${n === 1 ? '' : 's'} experience`]),
  ['', 'Any'],
];

export const DURATION_RANGES = [
  ['', 'Any'],
  ['1', 'Up to 1 month'],
  ['2', 'Up to 2 months'],
  ['3', 'Up to 3 months'],
  ['6', 'Up to 6 months'],
];

// Fit is filtered by the letter the cards print, not by a number nobody
// reads: each floor is its grade's lower bound, mirrored from GRADE_BANDS in
// @jobdekho/core/grade.js (the web bundle cannot import core), and shows
// that grade and every better one.
export const FIT_RANGES = [
  ['', 'Any'],
  ['55', 'A'],
  ['40', 'B'],
  ['25', 'C'],
  ['12', 'D'],
];

export const FIT_GRADE = Object.fromEntries(FIT_RANGES.filter(([value]) => value));

// "Grade B or better" for a floor, and the bare number for one a chat turn
// written before the grades still carries (it offered 44 as "Good fit").
export function fitFloorLabel(value) {
  const grade = FIT_GRADE[value];
  if (!grade) return `Fit ${value} and up`;
  return grade === 'A' ? 'Grade A' : `Grade ${grade} or better`;
}
