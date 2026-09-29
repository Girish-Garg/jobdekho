import { checkTex } from '../resume/guard/check.js'
import { cacheKey, readCachedPdf, writeCachedPdf } from '../resume/cache.js'
import { excerptLog } from '../resume/log-excerpt.js'

const UNSAFE = 'This document uses LaTeX that JobDekho does not allow, so it was not compiled. '
  + 'Change the lines listed below, or ask the chat to.'

// The resume builder's sentences, about a document rather than a resume;
// a failed compile names the line pdflatex stopped on, since the person has
// the source open beside it and there is no separate log to download.
function sentence(err) {
  if (err.kind !== 'compile_failed') return err.message.replace(/^The resume/, 'The document')
  const where = excerptLog(err.log)
  return `The document did not compile${where ? `: ${where}` : ''}. Fix the line it names, or ask the chat to.`
}

// The guard runs on EVERY compile, before the cache is even looked at: the
// text decides the cache key, so a PDF built before a guard change would
// otherwise still be served for a text the guard now refuses. Only text
// that passes is ever handed to pdflatex, whoever wrote it.
//
// Resolves to { pdf } or { failure: { status, body } } with body
// { error, kind, problems? }; kind is 'unsafe' for the guard, else one of
// LatexError's kinds (see resume/errors.js).
export async function documentPdf({ tex, store, userId, compile }) {
  const verdict = checkTex(tex)
  if (!verdict.ok) return { failure: { status: 422, body: { error: UNSAFE, kind: 'unsafe', problems: verdict.problems } } }
  const key = cacheKey('document', tex)
  const cached = readCachedPdf(store, userId, key)
  if (cached) return { pdf: cached }
  try {
    const { pdf } = await compile(tex)
    writeCachedPdf(store, userId, key, pdf)
    return { pdf }
  } catch (err) {
    if (err.name !== 'LatexError') throw err
    return { failure: { status: err.status, body: { error: sentence(err), kind: err.kind } } }
  }
}
