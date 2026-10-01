import { killBrowsers } from './browser-reap.js'
import { removeProfileDir } from './profile-dir.js'
import { broadcast } from './session-view.js'

// Ends a session completely: a question the AI beside it is answering, the
// picture, the sockets, the browser, any of its processes that outlived the
// library's own close, and the application's own folder with the files made
// for it. The kept profile and its sign-ins stay (see profile-dir.js). Safe
// to call twice.
export async function closeSession(s) {
  if (s.closing) return
  s.closing = true
  s.asking?.abort()
  for (const timer of Object.values(s.timers)) clearTimeout(timer)
  s.state = 'closed'
  broadcast(s, { t: 'closed' })
  for (const socket of s.sockets) socket.close(1000, 'closed')
  s.sockets.clear()
  await s.cast?.stop().catch(() => {})
  await s.pendingDialog?.dismiss().catch(() => {})
  await s.browser?.context.close().catch(() => {})
  await killBrowsers(s.profileDir).catch(() => 0)
  // The kept profile stays, with the sign-ins in it; the application's own
  // folder goes (see profile-dir.js).
  removeProfileDir(s.workDir ?? s.profileDir)
}
