import { normalizeAdzunaKeys } from '@jobdekho/store/adzuna-keys.js'

export const NEEDS_BOTH = 'Paste both the app id and the key from developer.adzuna.com.'
export const BAD_SHAPE = 'An Adzuna app id and key are letters and numbers only. Check nothing else was copied with them.'

// The card's two fields, read the way the store will keep them: { keys }
// for a whole pair, { keys: null } when both are empty (Remove sends that),
// or { error }, a sentence for the card. The sentence never quotes what was
// sent, since what was sent may be the key.
export function readKeysInput(body) {
  const appId = typeof body?.appId === 'string' ? body.appId.trim() : ''
  const appKey = typeof body?.appKey === 'string' ? body.appKey.trim() : ''
  if (!appId && !appKey) return { keys: null }
  if (!appId || !appKey) return { error: NEEDS_BOTH }
  const keys = normalizeAdzunaKeys({ appId, appKey })
  return keys ? { keys } : { error: BAD_SHAPE }
}
