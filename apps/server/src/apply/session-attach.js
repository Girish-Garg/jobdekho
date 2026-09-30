import { createWorld } from './isolated-world.js'
import { interceptChoosers } from './file-chooser.js'
import { startCast } from './screencast.js'
import { fpsFor } from './frame-pace.js'
import { send } from './cdp-call.js'
import { pushFrame, pushView } from './session-view.js'

// JobDekho's own address, as the Apply browser would reach it. A career page
// open in that browser must never be able to ask this server anything (the
// person's profile, their resume): requests there are failed before they
// leave the browser, on top of the Host and Origin checks the server makes.
export const ownOrigins = (port) => ['127.0.0.1', 'localhost', '[::1]'].map((host) => `http://${host}:${port}/*`)

async function blockOwnOrigin(cdp, port) {
  cdp.on('Fetch.requestPaused', (event) => {
    cdp.send('Fetch.failRequest', { requestId: event.requestId, errorReason: 'BlockedByClient' }).catch(() => {})
  })
  await send(cdp, 'Fetch.enable', { patterns: ownOrigins(port).map((urlPattern) => ({ urlPattern })) })
}

// A dialog the page raises (alert, confirm, leave-this-page) waits for the
// person: the panel shows it and JobDekho never answers it on their behalf.
function onDialog(s, dialog) {
  s.pendingDialog = dialog
  s.dialog = { kind: dialog.type(), message: dialog.message().slice(0, 300) }
  pushView(s)
}

// Everything a page needs once, however often the live view comes back to it
// (a sign-in popup opens and closes): its own world, the chooser, the block,
// the dialogs and the navigation hook. Listeners are added here and nowhere
// else, so a page returned to never answers an event twice.
async function prepare(s, page, cdp, hooks) {
  const world = createWorld(cdp)
  await interceptChoosers(cdp, (chooser) => {
    s.chooser = chooser
    pushView(s)
  })
  await blockOwnOrigin(cdp, hooks.port)
  page.on('dialog', (dialog) => onDialog(s, dialog))
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame() && s.active?.page === page) hooks.onNavigated(s)
  })
  return { page, cdp, world }
}

// Shows one page in the live view and points everything at it.
export async function activate(s, page, cdp, hooks) {
  if (!s.pages.has(page)) s.pages.set(page, await prepare(s, page, cdp, hooks))
  const prepared = s.pages.get(page)
  s.active = { page: prepared.page, cdp: prepared.cdp }
  s.world = prepared.world
  await restartCast(s)
}

// A navigation can move the page to another renderer process, after which a
// running screencast silently stops sending; it is started afresh instead.
export async function restartCast(s) {
  await s.cast?.stop().catch(() => {})
  s.cast = await startCast(s.active.cdp, { onFrame: (bytes, meta) => pushFrame(s, bytes, meta), fps: () => fpsFor(s.state) })
}
