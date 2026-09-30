// Whether documents can become PDFs, from the same PATH lookup the compile
// makes before it spawns anything (see resume/locate-latex.js), handed in as
// a path or null. Finding pdflatex is all this asks: compiling a test
// document would cost seconds and, under MiKTeX, might start its package
// installer, and a check run on every Settings load must cost neither.
//
// A missing LaTeX is a missing piece rather than a broken app: documents
// are LaTeX sources the person edits and can download as .tex, and only the
// PDF waits on it. The restart is part of the fix because the lookup reads
// the PATH JobDekho was started with, which an installer's change does not
// reach.
const FIX = 'Install MiKTeX from https://miktex.org/download on Windows, or TeX Live from https://tug.org/texlive elsewhere, '
  + 'then restart JobDekho.'

const MISSING = 'No LaTeX was found, so documents cannot be turned into PDFs; '
  + 'they still work as LaTeX source you can edit and download.'

export function latexCheck(path) {
  const base = { id: 'latex', label: 'PDF making' }
  if (!path) return { ...base, state: 'missing', detail: MISSING, fix: FIX }
  return { ...base, state: 'ok', detail: `LaTeX was found at ${path}, so documents turn into PDFs.`, fix: null }
}
