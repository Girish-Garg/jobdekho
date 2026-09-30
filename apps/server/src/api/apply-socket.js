import { timingSafeEqual } from 'node:crypto'
import { parseMessage } from '../apply/ws-messages.js'
import { viewOf, sendFrame } from '../apply/session-view.js'
import { onSocketMessage } from '../apply/session-input.js'
import { touch } from '../apply/session-registry.js'

// The live view's channel: pictures down as binary JPEG, the person's input
// up as small JSON messages, in order (a keystroke cannot overtake the one
// before it, as separate requests could). The local guard has already
// refused an upgrade from any other site's page; on top of that, nothing is
// sent or accepted until the first message carries the session's token, which
// only JobDekho's own page was ever given. It is sent as a message, never in
// the URL, where logs and history would keep it.
const HELLO_MS = 3000

function sameToken(given, token) {
  const a = Buffer.from(String(given))
  const b = Buffer.from(token)
  return a.length === b.length && timingSafeEqual(a, b)
}

function join(s, socket) {
  s.sockets.add(socket)
  touch(s)
  socket.send(JSON.stringify({ t: 'view', view: viewOf(s) }))
  sendFrame(s, socket)
}

// Messages are handled one after another, never side by side. A press first
// asks the page what is under it (for the native pickers), and the release
// right behind it used to reach the browser first: a release, then a press,
// is no click at all, and it left the page thinking the button was held.
function inOrder(s, work) {
  s.inbox = (s.inbox ?? Promise.resolve()).then(work, work)
  return s.inbox
}

export function socketRoute(app, registry) {
  app.get('/api/apply/sessions/:id/socket', { websocket: true, preHandler: app.requireAuth }, (socket, request) => {
    const s = registry.get(request.params.id)
    if (!s) {
      socket.close(4004, 'no such application')
      return
    }
    let trusted = false
    const hello = setTimeout(() => socket.close(4001, 'no token'), HELLO_MS)
    socket.on('message', (raw, binary) => {
      if (binary) return
      const msg = parseMessage(raw, s.size)
      if (!msg) return
      if (!trusted) {
        clearTimeout(hello)
        if (msg.t !== 'hello' || !sameToken(msg.token, s.token)) return socket.close(4001, 'bad token')
        trusted = true
        return join(s, socket)
      }
      touch(s)
      inOrder(s, () => onSocketMessage(s, msg).catch((err) => request.log.warn({ err: String(err?.message).slice(0, 200) }, 'apply input failed')))
    })
    socket.on('close', () => {
      clearTimeout(hello)
      s.sockets.delete(socket)
    })
  })
}
