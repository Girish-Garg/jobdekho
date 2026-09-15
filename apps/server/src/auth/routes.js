// Just a liveness check. Sign-in, sessions and sign-out were removed with
// Google OAuth: JobDekho is single-user now, and DEV_AUTH_USER_ID (see
// config.js) is the whole of how that one user is identified.
export async function authRoutes(app) {
  app.get('/healthz', async () => ({ ok: true }))
}
