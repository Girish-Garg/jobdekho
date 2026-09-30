import { redactUrl } from '@jobdekho/sources/http.js'

// The key must never leave the server whole: not in a response, an error or
// a log line. The one place its text can come back from is an error a run
// stored in runs.ndjson. http.js already takes app_id and app_key out of any
// URL in a thrown error, and this also takes out the key wherever else it
// might appear, in case some other error quoted it on its own.
export function redactKey(text, appKey) {
  const out = redactUrl(String(text ?? ''))
  return appKey ? out.split(appKey).join('REDACTED') : out
}

// The most any response shows of a key: its last four characters, and only
// when the key is long enough that four is a small part of it. Adzuna's keys
// are 32 characters; a short one pasted by mistake shows nothing.
export function keyEnd(appKey) {
  return typeof appKey === 'string' && appKey.length >= 12 ? appKey.slice(-4) : null
}
