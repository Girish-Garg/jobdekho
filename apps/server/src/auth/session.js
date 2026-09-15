const COOKIE = 'session'

// JobDekho runs as one local person: DEV_AUTH_USER_ID (see config.js) is the
// whole of how a user is picked, no sign-in involved. The cookie fallback
// below exists only because it is what a session would be carried in if this
// ever grew a second identity; nothing in this app issues that cookie today.
export function currentUser(request) {
  const dev = request.server.devUser
  if (dev) return dev
  const token = request.cookies?.[COOKIE]
  if (!token) return null
  try {
    return request.server.jwt.verify(token)
  } catch {
    return null
  }
}

export async function requireAuth(request, reply) {
  const user = currentUser(request)
  if (!user) return reply.code(401).send({ error: 'unauthorized' })
  request.user = user
}
