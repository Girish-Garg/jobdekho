export function loadConfig(env = process.env) {
  const production = env.NODE_ENV === 'production'
  if (production && !env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is required in production')
  }
  return {
    sessionSecret: env.SESSION_SECRET || 'dev-insecure-secret',
    port: Number(env.PORT || 3000),
    // Loopback only. There is no sign-in any more, so anything that can
    // reach this port can read the profile, the resume text and every
    // saved AI answer, and can spend the person's own CLI subscription.
    // On shared wifi that is the whole machine's data. Someone who really
    // wants it on their network sets HOST and knows what they are doing.
    host: env.HOST || '127.0.0.1',
    // JobDekho runs as one local person: this is the whole of how a request
    // gets a user id, no sign-in involved. "local" when unset, since a fresh
    // clone started without a .env otherwise answered every request with 401.
    // Forced to null in production, so a deployed box never runs as it.
    devUserId: production ? null : env.DEV_AUTH_USER_ID || 'local',
    // Apply assist, the sandboxed browser that fills applications, is
    // switched off (2026-10-01): a browser software drives is refused by
    // Google's sign-in and is plain for sites to detect, and the owner found
    // it unreliable. The code and its tests stay for when it is taken up
    // again; JOBDEKHO_APPLY_ASSIST=1 here and VITE_APPLY_ASSIST=1 for the
    // web app (apps/web/src/lib/features.js) bring it back.
    applyAssist: env.JOBDEKHO_APPLY_ASSIST === '1',
  }
}
