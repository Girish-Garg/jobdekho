import { parseJsonObject } from './loose-json.js'
import { ProviderError } from './errors.js'

// `claude -p --output-format json` wraps the reply in an envelope whose
// `result` holds the model's text. Older versions print the text bare, so
// handle both.
//
// The envelope reports failure as is_error WITH EXIT CODE 0. An expired login
// therefore looks like success to the caller unless this is checked, and the
// real message ("OAuth session expired") never reaches the user.
export function unwrapClaude(stdout, provider) {
  const envelope = parseJsonObject(stdout)
  if (envelope?.is_error) {
    const detail = String(envelope.result || 'the CLI reported an error').slice(0, 200)
    throw new ProviderError(provider.loginPattern.test(detail) ? 'login' : 'failed', provider, detail)
  }
  if (envelope && typeof envelope.result === 'string') return envelope.result
  return String(stdout || '')
}
