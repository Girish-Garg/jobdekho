import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import { authRoutes } from './auth/routes.js'
import { requireAuth } from './auth/session.js'
import { localGuard } from './auth/local-guard.js'
import { apiRoutes } from './api/index.js'
import { registerStatic } from './static.js'

const __dir = dirname(fileURLToPath(import.meta.url))
const DEFAULT_DIST = resolve(__dir, '../../web/dist')

// Loud on purpose: a server with no identity configured should never start quietly.
function devUser(config) {
  if (!config.devUserId) return null
  console.warn(`Running as the local user "${config.devUserId}"`)
  return { sub: config.devUserId, email: 'dev@localhost', name: 'Dev session', avatarUrl: null }
}

// A thrown DB or programming error can name real columns and constraints, so
// only the log gets the real message. A 4xx (including Fastify's own schema
// validation errors) already carries a message a client needs to fix its
// request, so only 5xx gets rewritten here. The shape stays { error } either
// way, matching every hand-written error response in this API.
function handleError(error, request, reply) {
  const status = error.statusCode ?? 500
  if (status < 500) {
    reply.code(status).send({ error: error.message })
    return
  }
  request.log.error(error)
  reply.code(500).send({ error: 'internal server error' })
}

export function buildApp({ config, dashboardStore, distDir = DEFAULT_DIST, logger = false }) {
  const app = Fastify({ logger })
  // Before anything else answers: see auth/local-guard.js for what it keeps out.
  app.addHook('onRequest', localGuard)
  app.register(cookie)
  app.register(multipart)
  app.register(jwt, { secret: config.sessionSecret })
  app.decorate('requireAuth', requireAuth)
  app.decorate('devUser', devUser(config))
  // Off unless asked for (see config.js): no Apply assist route exists then.
  app.decorate('applyAssist', Boolean(config.applyAssist))
  if (dashboardStore) app.decorate('dashboard', dashboardStore)
  app.register(authRoutes)
  app.register(apiRoutes)
  app.register(registerStatic, { distDir })
  app.setErrorHandler(handleError)
  return app
}
