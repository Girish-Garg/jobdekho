import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import { registerGoogleAuth } from './auth/google.js'
import { authRoutes } from './auth/routes.js'
import { requireAuth } from './auth/session.js'

export function buildApp({ config, userStore, fetchProfile, logger = false }) {
  const app = Fastify({ logger })
  app.register(cookie)
  app.register(jwt, { secret: config.sessionSecret })
  app.decorate('requireAuth', requireAuth)
  registerGoogleAuth(app, { config, userStore, fetchProfile })
  app.register(authRoutes)
  return app
}
