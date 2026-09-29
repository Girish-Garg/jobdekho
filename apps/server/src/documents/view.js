// A document as the browser receives it: the current source, and the
// history as times and authors. A version's text rides along only when
// asked for (GET /api/documents/:id?bodies=1), since twenty copies of a
// resume is most of the response and a history list needs none of them.
export function documentView(doc, { bodies = false } = {}) {
  const versions = (doc.versions ?? []).map(({ tex, ...rest }) => (bodies ? { ...rest, tex } : rest))
  return { ...doc, versions }
}
