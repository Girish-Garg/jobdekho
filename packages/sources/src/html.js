// Most ATS APIs return the job body as HTML. The level and degree classifiers
// read plain text, so tags and entities have to go before the body is stored.
export function stripHtml(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z]+;|&#\d+;/g, ' ')
}
