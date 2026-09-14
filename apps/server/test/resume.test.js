import { describe, it, expect } from 'vitest'
import { parseProfileJson, extractProfile } from '@jobdekho/server/resume/extract.js'
import { tidy, looksScanned } from '@jobdekho/server/resume/text.js'
import { CLAUDE } from '@jobdekho/server/ai/providers.js'

const HERE = () => '/usr/local/bin/claude'
// The route's chooser of CLI, stubbed: which CLI answers is select.test.js's subject.
const select = async () => CLAUDE
const answering = (stdout) => async () => ({ stdout, stderr: '', code: 0 })

describe('parseProfileJson', () => {
  it('reads a bare object', () => {
    expect(parseProfileJson('{"skills":["react"]}')).toEqual({ skills: ['react'] })
  })

  // The instruction says no prose and no fence, but a model may add them.
  it('digs the object out of prose or a fence', () => {
    expect(parseProfileJson('Here you go:\n```json\n{"years":3}\n```\nHope that helps'))
      .toEqual({ years: 3 })
  })

  it('returns null rather than throwing on junk', () => {
    expect(parseProfileJson('no json here')).toBeNull()
    expect(parseProfileJson('{ broken')).toBeNull()
    expect(parseProfileJson('')).toBeNull()
  })
})

// The envelope handling itself (including the is_error-with-exit-0 trap) is
// covered in ai.test.js; these prove the resume feature sits on it correctly.
describe('extractProfile', () => {
  it('sends the resume over stdin and returns the parsed profile', async () => {
    let sent = ''
    const run = async ({ input }) => { sent = input; return { stdout: '{"skills":["react"],"years":2}', stderr: '', code: 0 } }
    expect(await extractProfile('Jane Doe, React developer', { run, locate: HERE, select })).toEqual({ skills: ['react'], years: 2 })
    expect(sent).toContain('Jane Doe')
    expect(sent).toContain('RESUME:')
  })

  it('reports an authentication failure rather than a parse failure', async () => {
    const run = answering(JSON.stringify({ is_error: true, result: 'Failed to authenticate' }))
    const err = await extractProfile('x', { run, locate: HERE, select }).catch((e) => e)
    expect(err.kind).toBe('login')
    expect(err.message).toMatch(/Failed to authenticate/)
  })

  it('fails loudly when the reply has no object in it', async () => {
    const err = await extractProfile('x', { run: answering('sorry, I cannot'), locate: HERE, select }).catch((e) => e)
    expect(err.kind).toBe('unreadable')
    expect(err.message).toMatch(/not in the shape JobDekho expected/)
  })

  it('does not reach for a CLI that is not there', async () => {
    const err = await extractProfile('x', { run: answering('{}'), locate: () => null, select }).catch((e) => e)
    expect(err.kind).toBe('not_found')
  })
})

describe('resume text', () => {
  it('collapses the fragments pdfjs emits', () => {
    expect(tidy(['Jane', 'Doe', '\n\n\n', 'React'])).toBe('Jane Doe\nReact')
  })

  it('accepts a plain string as well as an array', () => {
    expect(tidy('  spaced   out  ')).toBe('spaced out')
  })

  // A scan has no text layer, and OCR is a different job from this one.
  it('flags a document with no usable text layer', () => {
    expect(looksScanned('')).toBe(true)
    expect(looksScanned('x'.repeat(199))).toBe(true)
    expect(looksScanned('x'.repeat(400))).toBe(false)
  })
})
