// A second try is worth it when the first may have been bad luck: no answer
// at all, a timeout, a server error. A 4xx is the host's considered answer (a
// dead slug, a Workday tenant asked on the wrong data centre, a block), and a
// 429 or a refusal asks for less, so asking again only doubled what a dead
// source cost on every run. http.js puts the status first in its message
// ("HTTP 404 for ..."); an adapter's own words carry "429", "refused" or
// "stopped" when a host told it to stop. LinkedIn's own refusal is a 999,
// which is no server error.
const STATUS = /\bHTTP (\d{3})\b/

export function retryable(err) {
  const message = String(err?.message ?? err ?? '')
  const status = Number(message.match(STATUS)?.[1])
  if (status) return status >= 500 && status < 600
  return !/\b429\b|\brefused\b|\bstopped\b/i.test(message)
}
