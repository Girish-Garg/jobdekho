import { describe, it, expect, vi } from 'vitest'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { isMiktex } from '@jobdekho/server/resume/miktex.js'
import { compileTex } from '@jobdekho/server/resume/compile.js'

// A fake pdflatex that writes a PDF into the temp directory it is handed,
// and remembers the arguments it was run with.
function fakeRun() {
  return vi.fn(async ({ cwd }) => {
    writeFileSync(join(cwd, 'resume.pdf'), '%PDF-fake')
    return { stdout: '', stderr: '', code: 0 }
  })
}

describe('isMiktex', () => {
  it('answers from the install path without starting a process', async () => {
    const probe = vi.fn()
    expect(await isMiktex('C:\\Users\\me\\AppData\\Local\\Programs\\MiKTeX\\miktex\\bin\\x64\\pdflatex.exe', { probe })).toBe(true)
    expect(probe).not.toHaveBeenCalled()
  })

  it('reads the version line when the path does not say, once per binary', async () => {
    const probe = vi.fn(async () => 'MiKTeX-pdfTeX 4.23 (MiKTeX 25.12)\n')
    expect(await isMiktex('/opt/tex/bin/pdflatex-a', { probe })).toBe(true)
    expect(await isMiktex('/opt/tex/bin/pdflatex-a', { probe })).toBe(true)
    expect(probe).toHaveBeenCalledTimes(1)
  })

  it('reads TeX Live, and a probe that fails, as not MiKTeX', async () => {
    expect(await isMiktex('/usr/bin/pdflatex-b', { probe: async () => 'pdfTeX 3.141592653-2.6-1.40.26 (TeX Live 2024)' })).toBe(false)
    expect(await isMiktex('/usr/bin/pdflatex-c', { probe: async () => { throw new Error('ENOENT') } })).toBe(false)
  })
})

describe('compileTex and the MiKTeX package installer', () => {
  it('turns the installer off for MiKTeX, keeping -no-shell-escape', async () => {
    const run = fakeRun()
    await compileTex('doc', { locate: () => 'C:/MiKTeX/pdflatex.exe', run, miktex: async () => true })
    const { args } = run.mock.calls[0][0]
    expect(args).toContain('--disable-installer')
    expect(args).toContain('-no-shell-escape')
    expect(args.at(-1)).toBe('resume.tex')
  })

  it('adds nothing for TeX Live, which has no such flag', async () => {
    const run = fakeRun()
    await compileTex('doc', { locate: () => '/usr/bin/pdflatex', run, miktex: async () => false })
    expect(run.mock.calls[0][0].args).not.toContain('--disable-installer')
  })
})
