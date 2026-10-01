import websocket from '@fastify/websocket'
import { createRegistry } from '../apply/session-registry.js'
import { applyDeps } from '../apply/apply-deps.js'
import { sessionRoutes } from './apply-sessions.js'
import { socketRoute } from './apply-socket.js'
import { copyRoutes } from './apply-copy.js'
import { askRoutes } from './apply-ask.js'

// Apply assist: a posting's application opened in the person's own Chrome or
// Edge, streamed into JobDekho, filled from their profile and handed back to
// them to review and submit. The WebSocket plugin is registered here, inside
// this plugin, so only these routes can upgrade.
//
// Tests decorate `applyDeps` (the browser, files and network, as fakes) or
// `applyRegistry` before ready(), so no suite starts a browser by accident.
export async function applyRoutes(app) {
  const deps = app.hasDecorator('applyDeps') ? app.applyDeps : applyDeps(app)
  const registry = app.hasDecorator('applyRegistry') ? app.applyRegistry : createRegistry(deps)
  await app.register(websocket, { options: { maxPayload: 64 * 1024 } })
  sessionRoutes(app, registry, deps)
  socketRoute(app, registry)
  copyRoutes(app, registry)
  askRoutes(app, registry)
  // A server shutting down takes its Apply browser with it.
  app.addHook('onClose', async () => registry.closeAll())
}
