export function loadConfig(env = process.env) {
  if (env.NODE_ENV === 'production' && !env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is required in production')
  }
  return {
    googleClientId: env.GOOGLE_CLIENT_ID,
    googleClientSecret: env.GOOGLE_CLIENT_SECRET,
    sessionSecret: env.SESSION_SECRET || 'dev-insecure-secret',
    baseUrl: env.BASE_URL || 'http://localhost:3000',
    databaseUrl: env.DATABASE_URL,
    port: Number(env.PORT || 3000),
  }
}
