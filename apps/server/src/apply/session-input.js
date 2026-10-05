import { relay } from './input-relay.js'
import { answerChooser } from './file-chooser.js'
import { pickerAt, applyPick } from './page/picker.js'
import { moveTo } from './session-state.js'
import { pushView } from './session-view.js'
import { scheduleScan } from './session-scan.js'

// One message from the live view. The person always wins: their first press,
// key or scroll while JobDekho is filling takes the wheel before it reaches
// the page, and the fill stops at its next field.
export async function onSocketMessage(s, msg) {
  if (s.closing) return
  if (msg.t === 'pick') return pickAnswered(s, msg.value)
  if (msg.t === 'chooser') return chooserAnswered(s, msg.choice)
  if (msg.t === 'dialog') return dialogAnswered(s, msg.accept)
  if (msg.t !== 'move' && (s.state === 'filling' || s.state === 'starting')) {
    moveTo(s, 'yours', 'took-over')
    pushView(s)
  }
  if (s.state !== 'yours' && s.state !== 'review') return
  if (msg.t === 'nav') return navigate(s, msg.go)
  if (msg.t === 'down' && msg.button === 'left' && await openPicker(s, msg)) return
  if (msg.t === 'up' && s.swallowUp) {
    s.swallowUp = false
    return
  }
  await relay({ cdp: s.active.cdp, world: s.world, mode: s.mode }, msg)
  if (msg.t === 'up' || msg.t === 'key' || msg.t === 'text') scheduleScan(s)
}

// Back, forward and reload from the panel's address bar: presses of the
// person's like any other, so they take the wheel first (above). The new page
// is read the way any navigation is (see session-scan.js).
const NAV = {
  back: (page) => page.goBack({ timeout: 15000 }),
  forward: (page) => page.goForward({ timeout: 15000 }),
  reload: (page) => page.reload({ timeout: 15000 }),
}

async function navigate(s, go) {
  const act = Object.hasOwn(NAV, go) ? NAV[go] : null
  if (act && s.active?.page) await act(s.active.page).catch(() => null)
}

// A press on a native select, date or list control: its popup would never
// show in the live view, so the panel draws the choices instead and the
// press itself (and its release) stops here.
async function openPicker(s, msg) {
  const found = await s.world.call(pickerAt, [msg.x, msg.y]).catch(() => null)
  if (!found) return false
  s.picker = found
  s.swallowUp = true
  pushView(s)
  return true
}

async function pickAnswered(s, value) {
  if (s.picker && value !== null) await s.world.call(applyPick, [value]).catch(() => {})
  s.picker = null
  // A release that never came (the pointer left the view) must not eat the
  // release of the person's next press.
  s.swallowUp = false
  pushView(s)
  scheduleScan(s, 300)
}

// The person picked which of their files answers the page's chooser.
async function chooserAnswered(s, choice) {
  const chooser = s.chooser
  s.chooser = null
  const file = choice === 'cancel' ? null : (await s.files)?.[choice]
  if (chooser && file) await answerChooser(s.active.cdp, chooser, file.path).catch(() => {})
  pushView(s)
  scheduleScan(s, 600)
}

async function dialogAnswered(s, accept) {
  const dialog = s.pendingDialog
  s.pendingDialog = null
  s.dialog = null
  if (dialog) await (accept ? dialog.accept() : dialog.dismiss()).catch(() => {})
  pushView(s)
}
