import { send, sleep } from './cdp-call.js'
import { focusField } from './page/fill-text.js'
import { chooseOption, optionsFor, comboShows, checkToggle } from './page/fill-choice.js'

// A radio button or checkbox ticked, as the AI beside the form was asked to.
export async function setToggle({ world }, fid) {
  return (await world.call(checkToggle, [fid])) ? 'filled' : 'failed'
}

// A native select: the option whose text is the answer, or nothing.
export async function setSelect({ world }, fid, value, exact = false) {
  return (await world.call(chooseOption, [fid, value, exact])) ? 'filled' : 'failed'
}

const norm = (text) => String(text).toLowerCase().replace(/\s+/g, ' ').trim()

// The suggestion that is the answer: the same words, else the first starting
// with them (suggestion lists come ranked, "Pune, Maharashtra, India" first
// for "Pune"), else the only one containing them. Two that merely contain
// the words are a guess, and JobDekho does not guess.
export function bestOption(options, value) {
  const want = norm(value)
  const exact = options.find((o) => norm(o.text) === want)
  if (exact) return exact
  const starts = options.find((o) => norm(o.text).startsWith(want))
  if (starts) return starts
  const within = options.filter((o) => norm(o.text).includes(want))
  return within.length === 1 ? within[0] : null
}

async function press(cdp, x, y) {
  await send(cdp, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
  await send(cdp, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
  await send(cdp, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
}

// A list that fills as you type (React-Select, a location lookup): type the
// answer, wait for the list, press the one option that is the answer the way
// a mouse would, and check the control now shows it. Never Enter, which on
// some of these would submit the form around them. The press lands only on
// an element the page itself marks as an option of this list.
export async function setCombobox({ cdp, world }, fid, value) {
  if (!(await world.call(focusField, [fid]))) return 'failed'
  await send(cdp, 'Input.insertText', { text: value })
  for (let waited = 0; waited < 3000; waited += 150) {
    await sleep(150)
    const pick = bestOption(await world.call(optionsFor, [fid]), value)
    if (!pick) continue
    await press(cdp, pick.x, pick.y)
    await sleep(250)
    // The whole option, not what was typed: the typed words can still be
    // sitting in the input when the press missed.
    return (await world.call(comboShows, [fid, pick.text])) ? 'filled' : 'failed'
  }
  return 'failed'
}
