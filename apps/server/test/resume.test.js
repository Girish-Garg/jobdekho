import { describe, it, expect } from 'vitest'
import { parseProfileJson, unwrapCli, extractProfile } from '@jobdekho/server/resume/extract.js'
import { tidy, looksScanned } from '@jobdekho/server/resume/text.js'

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

describe('unwrapCli', () => {
  it('unwraps the --output-format json envelope', () => {
    const envelope = JSON.stringify({ type: 'result', result: '{"skills":["go"]}' })
    expect(unwrapCli(envelope)).toEqual({ skills: ['go'] })
  })

  // Older CLI versions print the reply bare.
  it('accepts a bare object too', () => {
    expect(unwrapCli('{"skills":["go"]}')).toEqual({ skills: ['go'] })
  })

  // The CLI reports failure as is_error WITH exit code 0, so an expired login
  // looks like success unless the envelope is checked.
  it('surfaces an envelope error instead of treating it as a reply', () => {
    const failed = JSON.stringify({
      type: 'result', is_error: true,
      result: 'Failed to authenticate: OAuth session expired and could not be refreshed',
    })
    expect(() => unwrapCli(failed)).toThrow(/OAuth session expired/)
  })
})

describe('extractProfile', () => {
  it('sends the resume and returns the parsed profile', async () => {
    let sent = ''
    const run = async (input) => { sent = input; return '{"skills":["react"],"years":2}' }
    expect(await extractProfile('Jane Doe, React developer', { run })).toEqual({ skills: ['react'], years: 2 })
    expect(sent).toContain('Jane Doe')
    expect(sent).toContain('RESUME:')
  })

  it('reports an authentication failure rather than a parse failure', async () => {
    const run = async () => JSON.stringify({ is_error: true, result: 'Failed to authenticate' })
    await expect(extractProfile('x', { run })).rejects.toThrow(/Failed to authenticate/)
  })

  it('fails loudly when the reply has no object in it', async () => {
    await expect(extractProfile('x', { run: async () => 'sorry, I cannot' }))
      .rejects.toThrow(/Could not read a profile/)
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
