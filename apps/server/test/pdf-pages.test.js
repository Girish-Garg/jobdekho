import { describe, it, expect, vi, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildApp } from '@jobdekho/server/app.js'
import { countLines, pdfPages } from '@jobdekho/server/resume/pdf-pages.js'

const at = (height, str = 'words') => ({ str, transform: [10, 0, 0, 10, 72, height] })

describe('countLines', () => {
  it('counts text by the height it is drawn at, however many pieces a line is in', () => {
    expect(countLines([at(700), at(700, 'more'), at(688), at(676)])).toBe(3)
  })

  // A bullet mark or a raised figure sits a point or so off its line.
  it('takes text a hair off a line as that line', () => {
    expect(countLines([at(700), at(701.4, '2'), at(688)])).toBe(2)
  })

  it('counts nothing for blank pieces, a piece with no place, or no text at all', () => {
    expect(countLines([at(700, '  '), { str: 'lost' }, null])).toBe(0)
    expect(countLines()).toBe(0)
  })
})

describe('pdfPages', () => {
  it('refuses bytes that are not a PDF, for its caller to shrug off', async () => {
    await expect(pdfPages(Buffer.from('%PDF-fake'))).rejects.toThrow()
  })
})

const dirs = []
afterEach(() => { while (dirs.length) rmSync(dirs.pop(), { recursive: true, force: true }) })

async function makeApp(measure) {
  const dir = mkdtempSync(join(tmpdir(), 'jobdekho-pages-test-'))
  dirs.push(dir)
  const data = {}
  const app = buildApp({ config: { sessionSecret: 'test-secret' }, dashboardStore: { getProfile: vi.fn().mockResolvedValue({}) } })
  app.decorate('documentStore', { dir, documents: { get: (id) => data[id] ?? null, set: (id, record) => { data[id] = record } } })
  app.decorate('resumeCompile', vi.fn(async () => ({ pdf: Buffer.from('%PDF-fake'), log: '' })))
  if (measure) app.decorate('pdfPages', measure)
  await app.ready()
  const cookie = `session=${app.jwt.sign({ sub: 'u1', email: 'a@b.c', name: 'A', avatarUrl: null })}`
  const call = (method, url, body) => app.inject({
    method, url, payload: body ? JSON.stringify(body) : undefined, headers: body ? { cookie, 'content-type': 'application/json' } : { cookie },
  })
  const doc = (await call('POST', '/api/documents', { kind: 'resume', templateId: 'classic' })).json()
  return call('POST', `/api/documents/${doc.id}/pdf`)
}

describe('POST /api/documents/:id/pdf, and how long the PDF runs', () => {
  it('sends the pages and the lines on the last one with the PDF', async () => {
    const measure = vi.fn(async () => ({ pages: 2, lastLines: 6 }))
    const res = await makeApp(measure)
    expect(res.statusCode).toBe(200)
    expect(res.headers['x-pdf-pages']).toBe('2')
    expect(res.headers['x-pdf-last-lines']).toBe('6')
    expect(res.body).toBe('%PDF-fake')
    expect(measure.mock.calls[0][0].toString()).toBe('%PDF-fake')
  })

  it('still sends a PDF it cannot measure, without a length', async () => {
    const res = await makeApp()
    expect(res.statusCode).toBe(200)
    expect(res.headers['x-pdf-pages']).toBeUndefined()
    expect(res.body).toBe('%PDF-fake')
  })
})
