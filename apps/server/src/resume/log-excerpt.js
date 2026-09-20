// pdflatex's log runs to hundreds of lines of font and package chatter; the
// part worth showing a person is the "! " error line pdfTeX prints on
// failure and the handful of lines around it, which usually name the file,
// the line number and what pdfTeX expected instead.
const CONTEXT_LINES = 8

export function excerptLog(log) {
  if (!log) return ''
  const lines = log.split(/\r?\n/)
  const at = lines.findIndex((line) => line.startsWith('! '))
  const slice = at === -1 ? lines.slice(-CONTEXT_LINES) : lines.slice(at, at + CONTEXT_LINES)
  return slice.join('\n').trim()
}
