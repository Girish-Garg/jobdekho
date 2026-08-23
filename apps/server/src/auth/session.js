const COOKIE = 'session'
const SECURE = process.env.NODE_ENV === 'production'
const MAX_AGE = 60 * 60 * 24 * 7

export function issueSession(reply, user) {
  const token = reply.server.jwt.sign({ sub: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl })
  reply.setCookie(COOKIE, token, { httpOnly: true, secure: SECURE, sameSite: 'lax', path: '/', maxAge: MAX_AGE })
}

export function clearSession(reply) {
  reply.clearCookie(COOKIE, { path: '/' })
}

export function currentUser(request) {
  // Set only when DEV_AUTH_USER_ID is present outside production. Every request
  // then runs as that user, so both requireAuth and /auth/me see a session.
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
