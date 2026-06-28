import oauth2 from '@fastify/oauth2'
import { issueSession } from './session.js'

export async function fetchGoogleProfile(accessToken, fetchImpl = fetch) {
  const res = await fetchImpl('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`userinfo ${res.status}`)
  const u = await res.json()
  return { googleId: u.sub, email: u.email, name: u.name ?? null, avatarUrl: u.picture ?? null }
}

export async function completeLogin(reply, userStore, profile) {
  const user = await userStore.upsertUser(profile)
  issueSession(reply, user)
  return reply.redirect('/')
}

export function registerGoogleAuth(app, { config, userStore, fetchProfile = fetchGoogleProfile }) {
  app.register(oauth2, {
    name: 'googleOAuth2',
    scope: ['profile', 'email'],
    credentials: {
      client: { id: config.googleClientId, secret: config.googleClientSecret },
      auth: oauth2.GOOGLE_CONFIGURATION,
    },
    startRedirectPath: '/auth/google',
    callbackUri: `${config.baseUrl}/auth/google/callback`,
  })
  app.get('/auth/google/callback', async (request, reply) => {
    try {
      const { token } = await app.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request)
      const profile = await fetchProfile(token.access_token)
      return completeLogin(reply, userStore, profile)
    } catch (err) {
      request.log.error(err)
      return reply.redirect('/?auth=error')
    }
  })
}
