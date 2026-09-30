import { send } from './cdp-call.js'
import { focusField, settleField, setNative } from './page/fill-text.js'

const digits = (text) => String(text).replace(/\D/g, '')
const norm = (text) => String(text).replace(/\s+/g, ' ').trim()

// Whether the page kept the value: the same words, or the same number where a
// mask reformats digits as they arrive ("+91 90000 00000" as "090000 00000").
export function sameValue(got, want) {
  if (got === null || got === undefined) return false
  if (norm(got) === norm(want)) return true
  const wanted = digits(want)
  return wanted.length >= 6 && digits(got).endsWith(wanted.slice(-10))
}

// Types a value the way a person's keyboard would arrive: focus, select
// whatever is there, and the browser's own "insert text", which fires the
// input events React, Angular and input masks listen for (measured on a React
// form, where a plain value assignment is silently thrown away). Checked by
// reading the value back once the field is let go of.
export async function setText({ cdp, world }, fid, value) {
  if (!(await world.call(focusField, [fid]))) return 'failed'
  await send(cdp, 'Input.insertText', { text: value })
  if (sameValue(await world.call(settleField, [fid]), value)) return 'filled'
  // A few masked inputs drop inserted text; the prototype's own setter,
  // with the events it should have fired, is the one fallback.
  return sameValue(await world.call(setNative, [fid, value]), value) ? 'filled' : 'failed'
}
