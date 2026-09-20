import { describe, it, expect, vi } from 'vitest'
import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { compileTex } from '@jobdekho/server/resume/compile.js'

// No real pdflatex ever runs in this suite (too slow and machine-dependent,
// per the task brief): `locate` and `run` are injected, the same
// dependency-injection shape resume/extract.js already uses for the AI CLI.
// The fake `run` writes made-up output straight into the real temp `cwd` it
// is handed, which is what exercises compile.js's own temp-directory and
// cleanup logic without a compiler.
const locateAt = (path) => () => path

function fakeRun(pdf, code = 0) {
  return vi.fn(async ({ cwd }) => {
    if (pdf) writeFileSync(join(cwd, 'resume.pdf'), pdf)
    writeFileSync(join(cwd, 'resume.log'), 'This is pdfTeX\n! Undefined control sequence.\nl.3 \\bogus\n')
    return { stdout: '', stderr: '', code }
  })
}

describe('compileTex', () => {
  it('reports not_found, written for a person, when no pdflatex is on PATH', async () => {
    await expect(compileTex('doc', { locate: () => null })).rejects.toMatchObject({ name: 'LatexError', kind: 'not_found', status: 503 })
    await expect(compileTex('doc', { locate: () => null })).rejects.toThrow(/miktex\.org/)
  })

  it('returns the PDF bytes on a clean exit and removes the temp directory', async () => {
    const run = fakeRun(Buffer.from('%PDF-fake'))
    let capturedDir
    const wrapped = vi.fn(async (opts) => {
      capturedDir = opts.cwd
      return run(opts)
    })
    const { pdf } = await compileTex('doc', { locate: locateAt('/fake/pdflatex'), run: wrapped })
    expect(pdf.toString()).toBe('%PDF-fake')
    expect(existsSync(capturedDir)).toBe(false)
  })

  it('compiles in a fresh directory under the OS temp dir, never the repo', async () => {
    const run = fakeRun(Buffer.from('%PDF-fake'))
    let cwdSeen
    await compileTex('doc', {
      locate: locateAt('/fake/pdflatex'),
      run: async (opts) => { cwdSeen = opts.cwd; return run(opts) },
    })
    expect(cwdSeen.startsWith(tmpdir())).toBe(true)
    expect(cwdSeen).not.toContain('JobDekho')
  })

  it('passes -no-shell-escape, -halt-on-error and -interaction=nonstopmode', async () => {
    let argsSeen
    await compileTex('doc', {
      locate: locateAt('/fake/pdflatex'),
      run: async (opts) => { argsSeen = opts.args; return fakeRun(Buffer.from('x'))(opts) },
    })
    expect(argsSeen).toContain('-no-shell-escape')
    expect(argsSeen).toContain('-halt-on-error')
    expect(argsSeen).toContain('-interaction=nonstopmode')
  })

  it('reports compile_failed with just the "! " error excerpt, not the whole log', async () => {
    await expect(
      compileTex('doc', { locate: locateAt('/fake/pdflatex'), run: fakeRun(null, 1) }),
    ).rejects.toMatchObject({ name: 'LatexError', kind: 'compile_failed', status: 422 })
    try {
      await compileTex('doc', { locate: locateAt('/fake/pdflatex'), run: fakeRun(null, 1) })
    } catch (err) {
      expect(err.message).toContain('Undefined control sequence')
      expect(err.message).not.toContain('This is pdfTeX')
      expect(err.message).toContain('Download the .tex file')
    }
  })

  it('turns a timed-out spawn into the timeout kind', async () => {
    const timeoutRun = async () => {
      const err = new Error('did not exit in time')
      err.code = 'ETIMEDOUT'
      throw err
    }
    await expect(
      compileTex('doc', { locate: locateAt('/fake/pdflatex'), run: timeoutRun }),
    ).rejects.toMatchObject({ kind: 'timeout', status: 504 })
  })
})
