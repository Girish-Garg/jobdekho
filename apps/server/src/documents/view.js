import { headerNotice } from './profile-header.js'

// A document as the browser receives it: the current source, and the
// history as times and authors. A version's text rides along only when
// asked for (GET /api/documents/:id?bodies=1), since twenty copies of a
// resume is most of the response and a history list needs none of them.
// `headerKept` is the server's own memo of a declined header (see
// profile-header.js); the browser is told only what it decides.
export function documentView(doc, { bodies = false } = {}) {
  const { headerKept, ...rest } = doc
  const versions = (doc.versions ?? []).map(({ tex, ...version }) => (bodies ? { ...version, tex } : version))
  return { ...rest, versions }
}

// The view with `profileHeader`: { fields } naming the parts of the header
// the person's profile would now write differently, or null. Every route
// that answers with the open document says this, so a save or a restore
// never hides the offer, nor keeps one it settled.
export function documentViewFor(doc, profile, options) {
  return { ...documentView(doc, options), profileHeader: headerNotice(doc, profile) }
}
