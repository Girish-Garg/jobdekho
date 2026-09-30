import { send } from './cdp-call.js'
import { keyEvents } from './key-table.js'
import { scrollAt } from './page/picker.js'

// The person's own mouse, wheel and keyboard, from the live view into the
// browser as the browser's own input events. This is the person acting, so
// nothing here judges what they press: they may submit, sign in, or type a
// password themselves. What JobDekho does on its own is fill-run.js's job.
const MOUSE = { down: 'mousePressed', up: 'mouseReleased', move: 'mouseMoved' }

export async function relay({ cdp, world, mode }, msg) {
  if (MOUSE[msg.t]) {
    // A move with the button held is a drag (a slider, a text selection).
    return send(cdp, 'Input.dispatchMouseEvent', {
      type: MOUSE[msg.t],
      x: msg.x,
      y: msg.y,
      button: msg.t === 'move' ? 'none' : msg.button,
      buttons: msg.button === 'left' && msg.t !== 'up' ? 1 : 0,
      clickCount: msg.clicks,
    })
  }
  if (msg.t === 'wheel') {
    // A minimized window stops taking wheel events after a file chooser
    // (measured), so there the page is scrolled directly instead.
    if (mode === 'minimized') return world.call(scrollAt, [msg.x, msg.y, msg.dx, msg.dy])
    return send(cdp, 'Input.dispatchMouseEvent', { type: 'mouseWheel', x: msg.x, y: msg.y, deltaX: msg.dx, deltaY: msg.dy })
  }
  if (msg.t === 'key') {
    for (const params of keyEvents(msg.name, msg.mods) ?? []) await send(cdp, 'Input.dispatchKeyEvent', params)
    return null
  }
  // Any script, IME and paste included: inserted as one piece of text.
  if (msg.t === 'text') return send(cdp, 'Input.insertText', { text: msg.text })
  return null
}
