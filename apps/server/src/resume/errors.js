// Same shape as apps/server/src/ai/errors.js: a status an API route can send
// straight through, a kind a UI can match without parsing prose, and a
// sentence written for the person at the browser rather than for a log.
const STATUS = { not_found: 503, compile_failed: 422, timeout: 504, failed: 502 }

const INSTALL_SENTENCE = 'No LaTeX installation was found on this computer, so the PDF could not be built. '
  + 'Install MiKTeX (miktex.org) or TeX Live (tug.org/texlive), then try again. '
  + 'The .tex file can still be downloaded and compiled anywhere LaTeX is installed.'

const MESSAGE = {
  not_found: () => INSTALL_SENTENCE,
  compile_failed: (detail) =>
    `The resume did not compile${detail ? `: ${detail}` : ''}. Download the .tex file to see the full log.`,
  timeout: (detail) => `The resume took too long to compile and was stopped (${detail}). Try again.`,
  failed: (detail) => `The resume could not be compiled${detail ? `: ${detail}` : ''}. Try again.`,
}

export class LatexError extends Error {
  constructor(kind, detail = '', log = '') {
    super(MESSAGE[kind](detail))
    this.name = 'LatexError'
    this.kind = kind
    this.status = STATUS[kind]
    this.log = log
  }
}
