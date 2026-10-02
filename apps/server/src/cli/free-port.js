import { createServer } from 'node:net'

// The first port from `start` that nothing on this computer listens on,
// tried in turn, or null after `tries`. Probing and letting go leaves a
// moment in which another program could take the port; the server's own
// listen still fails loudly if one does.
export async function freePort(start, { host = '127.0.0.1', tries = 20 } = {}) {
  for (let port = start; port < start + tries && port <= 65535; port += 1) {
    if (await isFree(port, host)) return port
  }
  return null
}

const isFree = (port, host) => new Promise((resolve) => {
  const probe = createServer()
  probe.once('error', () => resolve(false))
  probe.listen({ port, host, exclusive: true }, () => probe.close(() => resolve(true)))
})
