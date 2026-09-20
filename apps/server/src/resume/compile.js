import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runCli } from '../ai/spawn.js'
import { locatePdflatex } from './locate-latex.js'
import { excerptLog } from './log-excerpt.js'
import { LatexError } from './errors.js'

const TEX_NAME = 'resume.tex'
const LOG_NAME = 'resume.log'
const PDF_NAME = 'resume.pdf'
const DEFAULT_TIMEOUT_MS = 60000

function readIfPresent(path) {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return ''
  }
}

// Renders a .tex string to PDF bytes in a fresh temp directory, never inside
// the repo or the data directory: a crashed or hostile document leaves
// nothing behind once this returns. -no-shell-escape is passed explicitly
// even though it is pdfTeX's default, because this is the one flag a
// document itself cannot be allowed to turn back on; -halt-on-error and
// -interaction=nonstopmode keep a broken document from ever waiting on
// input that will never come. Throws LatexError; a caller that wants the
// log on success too can read it off the return value.
//
// `locate` and `run` default to the real binary lookup and the real spawn
// (see locate-latex.js and ai/spawn.js) and exist as parameters, the same
// way resume/extract.js takes { run, locate }, purely so a test can compile
// nothing at all: a fake `run` can write a made-up resume.pdf and
// resume.log into the real temp `cwd` it is handed and return synchronously,
// which exercises this file's own temp-directory and error-handling logic
// without spawning pdflatex or being slow or machine-dependent.
export async function compileTex(tex, { timeoutMs = DEFAULT_TIMEOUT_MS, env, locate = locatePdflatex, run = runCli } = {}) {
  const pdflatex = locate(env)
  if (!pdflatex) throw new LatexError('not_found')

  const dir = mkdtempSync(join(tmpdir(), 'jobdekho-resume-'))
  try {
    writeFileSync(join(dir, TEX_NAME), tex, 'utf8')
    const args = ['-interaction=nonstopmode', '-halt-on-error', '-no-shell-escape', `-output-directory=${dir}`, TEX_NAME]
    let result
    try {
      result = await run({ file: pdflatex, args, input: '', timeoutMs, cwd: dir })
    } catch (err) {
      throw new LatexError(err.code === 'ETIMEDOUT' ? 'timeout' : 'failed', err.message)
    }
    const log = readIfPresent(join(dir, LOG_NAME))
    if (result.code !== 0) throw new LatexError('compile_failed', excerptLog(log), log)
    return { pdf: readFileSync(join(dir, PDF_NAME)), log }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}
