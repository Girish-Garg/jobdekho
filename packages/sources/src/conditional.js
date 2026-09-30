// A board that answers If-None-Match with 304 has not changed since it was
// last read: nothing is downloaded, and the run counts every posting that
// read listed as seen again (context.unchanged, see the scraper's
// run-context.js). Greenhouse and Ashby answer so (checked on 2026-09-30: a
// 3 MB Greenhouse board came back as an empty 304). Lever sends an ETag but
// ignores it, so it is not asked.
//
// Resolves with the response, or null when the board is unchanged. Without a
// context (a test, a one-off call) it is a plain request.
export async function fetchUnlessUnchanged(http, context, name, url) {
  const etag = context?.etagFor?.(name, url) ?? null
  const res = await http(url, etag ? { headers: { 'If-None-Match': etag } } : {})
  if (res.status === 304) {
    context?.unchanged?.(name)
    return null
  }
  const next = res.headers?.get?.('etag')
  if (next) context?.remember?.(name, url, next)
  return res
}
