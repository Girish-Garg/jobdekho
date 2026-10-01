import { guard } from './action-guard.js'
import { setText } from './set-text.js'
import { setSelect, setCombobox, setToggle } from './set-choice.js'
import { setFile } from './set-file.js'
import { sleep } from './cdp-call.js'

// The only things JobDekho ever does to a page. There is no press of an
// arbitrary button and no key: no Enter (one Enter in a text box submits the
// whole form, measured), no Tab, nothing that could send, sign in or move on.
const ACTS = {
  text: (ctx, step) => setText(ctx, step.fid, step.value),
  select: (ctx, step) => setSelect(ctx, step.fid, step.value, step.exact),
  combobox: (ctx, step) => setCombobox(ctx, step.fid, step.value),
  file: (ctx, step) => setFile(ctx, step.fid, step.path, step.name),
  // Only for an answer the person asked for in the chat (see ask-fields.js).
  toggle: (ctx, step) => setToggle(ctx, step.fid),
}

// Runs a plan one field at a time, stopping the moment the wheel leaves
// JobDekho (the person pressed something in the live view). A field the page
// refused is reported and not retried. `onResult` hears about every field.
export async function runFill(ctx, steps, onResult) {
  let done = 0
  for (const step of steps) {
    const stop = await guard(ctx, step).catch(() => 'gone')
    if (stop === 'stopped') break
    const act = ACTS[step.action]
    const result = stop ?? (act ? await act(ctx, step).catch(() => 'failed') : 'failed')
    onResult(step.fid, result)
    done += 1
    // Pages check values and reveal follow-up questions as they land; a
    // resume can take a site a moment to read.
    await sleep(step.action === 'file' ? 800 : 90)
  }
  return done
}
