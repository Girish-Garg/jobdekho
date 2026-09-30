// JobDekho's server listens on this computer only and treats every request
// as its one person (see session.js). Two kinds of web page could still use
// that from inside the person's own browser:
//
// - A site whose name the attacker points at 127.0.0.1 (DNS rebinding): the
//   browser then treats this server as that site and lets the page read the
//   profile and resume. Its requests carry the attacker's name as Host, so
//   only a local Host is let in.
// - Any site at all, posting across origins: a form or a text/plain fetch
//   needs no permission to be sent, and could start an AI call or a scrape.
//   The browser stamps those with Origin and Sec-Fetch-Site, so a write is
//   let in only from a local origin (the app itself, or the Vite dev server
//   on another port) or from something that is not a browser at all.
//
// Reads from another site are left alone: without CORS headers the browser
// never hands that site the answer.
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])
const WRITES = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

// A Host or Origin header's host name, without the port; null if unreadable.
export function hostName(value) {
  if (!value) return null
  try {
    return new URL(value.includes('://') ? value : `http://${value}`).hostname
  } catch {
    return null
  }
}

export const isLocalHost = (value) => LOCAL_HOSTS.has(hostName(value))

// Why a request is refused, or null to let it through. A WebSocket upgrade is
// a GET, but what flows over it can act, so it is held to the same rule as a
// write.
export function refusal({ method, headers }) {
  if (!isLocalHost(headers.host)) return 'This server only answers to its own address on this computer.'
  const acts = WRITES.has(method) || String(headers.upgrade || '').toLowerCase() === 'websocket'
  if (!acts) return null
  if (headers['sec-fetch-site'] === 'cross-site') return 'Another site cannot make changes here.'
  if (headers.origin && !isLocalHost(headers.origin)) return 'Another site cannot make changes here.'
  return null
}

export async function localGuard(request, reply) {
  const why = refusal(request)
  if (!why) return undefined
  // A refused WebSocket upgrade has been handed over by the HTTP server and
  // nothing else will ever end it, so without this each one left a socket
  // open for good: one a page from another site could repeat at will.
  if (String(request.headers.upgrade || '').toLowerCase() === 'websocket') {
    reply.header('connection', 'close')
    reply.raw.once('finish', () => request.raw.socket?.destroy())
  }
  return reply.code(403).send({ error: why })
}
