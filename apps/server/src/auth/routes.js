import { currentUser, clearSession } from './session.js'

export async function authRoutes(app) {
  app.get('/healthz', async () => ({ ok: true }))

  app.get('/auth/me', async (request, reply) => {
    const user = currentUser(request)
    if (!user) return reply.code(401).send({ error: 'unauthorized' })
    return { id: user.sub, email: user.email, name: user.name, avatarUrl: user.avatarUrl }
  })

  app.post('/auth/logout', async (request, reply) => {
    clearSession(reply)
    return reply.code(204).send()
  })
}
