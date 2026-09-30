import { keyEnd, redactKey } from './redact.js'

// What the Adzuna routes answer about the key in use: whether there is one,
// where it came from ('settings' or 'environment'), the app id, which is an
// identifier rather than the secret, and the key's last four characters,
// never more. Beside it, how Adzuna did in the last scrape (see
// last-result.js), its error passed through the same redaction.
export function adzunaView(keys, lastRun) {
  return {
    configured: Boolean(keys),
    from: keys?.from ?? null,
    appId: keys?.appId ?? null,
    keyEnd: keyEnd(keys?.appKey),
    lastRun: lastRun ? { ...lastRun, error: lastRun.error === null ? null : redactKey(lastRun.error, keys?.appKey) } : null,
  }
}
