import { FIT_RANGES, FIT_GRADE } from './ranges.js';

// A chat answer's Fit button can predate today's floors: the conversation is
// kept, and its buttons still carry the number they were made with. The
// letter is what the person saw ("Show grade B or better"), so that is what
// the button applies, at today's floor for that letter. A bare 25 cannot be
// read on its own: it was D before and is C now, so the label decides.
const FLOOR_OF = Object.fromEntries(FIT_RANGES.filter(([value]) => value).map(([value, grade]) => [grade, value]));

// The floors before these; a number with no label is read against them.
const EARLIER = [['A', 62], ['B', 50], ['C', 38], ['D', 25]];

export function chatFitFloor(floor, label = '') {
  if (floor === '' || floor === null || floor === undefined) return floor;
  const named = /\bgrade ([A-D])\b/i.exec(label)?.[1]?.toUpperCase();
  if (named) return FLOOR_OF[named];
  if (FIT_GRADE[floor]) return String(floor);
  const earlier = EARLIER.find(([, bound]) => Number(floor) >= bound)?.[0];
  return earlier ? FLOOR_OF[earlier] : String(floor);
}
