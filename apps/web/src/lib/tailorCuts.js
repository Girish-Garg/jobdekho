// A cut "Fit on one page" offers, as the change to a tailoring's choices
// that makes it: { flipped?, cut?, compact? }. Mirrors the server's
// resume/plan-patch.js, which measures each cut the same way it is made
// here, so the lines a cut is said to save are the lines ticking it saves.
const merged = (list = [], values = [], on = true) => (
  on ? [...new Set([...list, ...values])] : list.filter((one) => !values.includes(one))
);

// Own lists only, so an entry id named like an object property finds none.
const listOf = (map, id) => (map && Object.hasOwn(map, id) ? map[id] : []);

export function withCut(choices, patch, on) {
  const cut = { ...choices.cut };
  for (const [id, bullets] of Object.entries(patch.cut ?? {})) cut[id] = merged(listOf(cut, id), bullets, on).sort((a, b) => a - b);
  return {
    ...choices,
    flipped: merged(choices.flipped, patch.flipped, on),
    cut,
    compact: patch.compact ? on : choices.compact,
  };
}

// Ticked when everything the cut takes out is out, however it got there: a
// project left out by hand lower on the screen ticks its cut here too.
export function cutMade(choices, patch) {
  const flipped = (patch.flipped ?? []).every((id) => choices.flipped.includes(id));
  const bullets = Object.entries(patch.cut ?? {}).every(([id, ats]) => ats.every((at) => listOf(choices.cut, id).includes(at)));
  return flipped && bullets && (!patch.compact || choices.compact);
}

// What the ticked cuts save together, for the line under the list.
export const savedBy = (choices, cuts) => cuts.filter((cut) => cutMade(choices, cut.patch)).reduce((sum, cut) => sum + (cut.saves ?? 0), 0);
