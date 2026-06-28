import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import { registerGoogleAuth } from './auth/google.js'
import { authRoutes } from './auth/routes.js'
import { requireAuth } from './auth/session.js'
import { apiRoutes } from './api/index.js'
import { registerStatic } from './static.js'

const __dir = dirname(fileURLToPath(import.meta.url))
const DEFAULT_DIST = resolve(__dir, '../../web/dist')

export function buildApp({ config, userStore, fetchProfile, dashboardStore, distDir = DEFAULT_DIST, logger = false }) {
  const app = Fastify({ logger })
  app.register(cookie)
  app.register(jwt, { secret: config.sessionSecret })
  app.decorate('requireAuth', requireAuth)
  if (dashboardStore) app.decorate('dashboard', dashboardStore)
  registerGoogleAuth(app, { config, userStore, fetchProfile })
  app.register(authRoutes)
  app.register(apiRoutes)
  app.register(registerStatic, { distDir })
  return app
}
