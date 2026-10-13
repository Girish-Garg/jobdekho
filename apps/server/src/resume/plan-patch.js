// A cut the fit helper offers (see actions/resume-tailor-fit.js), as the
// change to a plan's choices that makes it:
//
//   { flipped?: [entry ids], cut?: { [entryId]: [bullets] }, compact?: true }
//
// Everything a patch names is something the plan shows by default, so
// applying it only ever takes something out or tightens the layout. The web
// app mirrors these two (apps/web/src/lib/tailorCuts.js) to tick a cut and
// to know one is ticked.
const merged = (list = [], values = [], on = true) => (
  on ? [...new Set([...list, ...values])] : list.filter((one) => !values.includes(one))
)

// The choices with one cut made, or taken back.
export function patched(choices = {}, patch = {}, on = true) {
  const cut = { ...(choices.cut ?? {}) }
  for (const [id, bullets] of Object.entries(patch.cut ?? {})) cut[id] = merged(cut[id], bullets, on).sort((a, b) => a - b)
  return {
    ...choices,
    flipped: merged(choices.flipped, patch.flipped, on),
    cut,
    compact: patch.compact ? on : Boolean(choices.compact),
  }
}

// The choices with several cuts made at once.
export const patchedAll = (choices, patches) => patches.reduce((now, patch) => patched(now, patch, true), choices)
