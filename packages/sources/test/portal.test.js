import { describe, it, expect } from 'vitest'
import { readPages, politeAdapter, isThrottled } from '@jobdekho/sources/companies/portal-polite.js'
import { describeNew, MAX_DETAILS } from '@jobdekho/sources/companies/portal-describe.js'
import { sections, inIndia, titleCase } from '@jobdekho/sources/companies/portal-text.js'

const noPause = async () => {}
const refused = () => new Error('HTTP 429 for https://careers.example.com/jobs')

describe('readPages', () => {
  const page = (n, size) => Array.from({ length: size }, (_, i) => `${n}-${i}`)

  it('reads until a short page, and no further than maxPages', async () => {
    const asked = []
    const short = await readPages(async (n) => (asked.push(n), page(n, n < 2 ? 3 : 1)), { maxPages: 9, pageSize: 3, pause: noPause })
    expect(asked).toEqual([0, 1, 2])
    expect(short.rows).toHaveLength(7)
    const full = await readPages(async (n) => page(n, 3), { maxPages: 2, pageSize: 3, pause: noPause })
    expect(full.rows).toHaveLength(6)
  })

  it('pauses before every page but the first', async () => {
    let pauses = 0
    await readPages(async (n) => page(n, 2), { maxPages: 3, pageSize: 2, pause: async () => { pauses++ } })
    expect(pauses).toBe(2)
  })

  it('throws when the first page fails, skips a later one', async () => {
    await expect(readPages(async () => { throw new Error('HTTP 500') }, { maxPages: 3, pageSize: 2, pause: noPause }))
      .rejects.toThrow('HTTP 500')
    const out = await readPages(async (n) => {
      if (n === 1) throw new Error('HTTP 500')
      return page(n, n === 2 ? 1 : 2)
    }, { maxPages: 5, pageSize: 2, pause: noPause })
    expect(out.rows).toEqual(['0-0', '0-1', '2-0'])
    expect(out.throttled).toBe(false)
  })

  it('stops at a 429 and keeps the pages already read', async () => {
    const asked = []
    const out = await readPages(async (n) => {
      asked.push(n)
      if (n === 1) throw refused()
      return page(n, 2)
    }, { maxPages: 5, pageSize: 2, pause: noPause })
    expect(asked).toEqual([0, 1])
    expect(out).toEqual({ rows: ['0-0', '0-1'], throttled: true })
  })
})

describe('politeAdapter', () => {
  it('clears the last note before a run', async () => {
    const adapter = politeAdapter('acme', async (http, context, self) => {
      if (context?.stop) self.note = 'stopped early'
      return []
    })
    await adapter.fetch(null, { stop: true })
    expect(adapter.note).toBe('stopped early')
    await adapter.fetch(null, {})
    expect(adapter.note).toBeUndefined()
  })

  it("answers the runner's retry after a 429 without asking the site again", async () => {
    let asked = 0
    const adapter = politeAdapter('acme', async () => { asked++; throw refused() })
    await expect(adapter.fetch()).rejects.toThrow('acme stopped: the careers site answered 429')
    await expect(adapter.fetch()).rejects.toThrow('acme stopped')
    expect(asked).toBe(1)
  })

  it('passes other failures through, and a later run may try again', async () => {
    let asked = 0
    const adapter = politeAdapter('acme', async () => { asked++; throw new Error('HTTP 503') })
    await expect(adapter.fetch()).rejects.toThrow('HTTP 503')
    await expect(adapter.fetch()).rejects.toThrow('HTTP 503')
    expect(asked).toBe(2)
  })

  it('reads the status the way http.js reports it', () => {
    expect(isThrottled(refused())).toBe(true)
    expect(isThrottled(new Error('HTTP 4290'))).toBe(false)
    expect(isThrottled(new Error('HTTP 500 for https://x/429'))).toBe(false)
  })
})

describe('describeNew', () => {
  const rows = (n) => Array.from({ length: n }, (_, i) => ({ id: String(i + 1), title: `Engineer ${i + 1}` }))
  const spec = (over = {}) => ({
    name: 'acme',
    adapter: {},
    pause: noPause,
    idOf: (r) => r.id,
    asListed: (r) => ({ externalId: r.id, title: r.title, company: 'Acme', location: 'India' }),
    read: async (r) => ({ body: `about ${r.id}` }),
    toPosting: (r, d) => ({ externalId: r.id, description: d.body }),
    ...over,
  })

  it('reads only postings the store lacks and the filter keeps, at most 40', async () => {
    const read = []
    const context = {
      known: (name, id) => name === 'acme' && id === '1',
      wanted: (name, raw) => raw.title !== 'Engineer 2',
    }
    const out = await describeNew({ rows: rows(60), throttled: false }, spec({ context, read: async (r) => (read.push(r.id), { body: r.id }) }))
    expect(read).toHaveLength(MAX_DETAILS)
    expect(read.slice(0, 2)).toEqual(['3', '4'])
    expect(out).toHaveLength(40)
  })

  it('reads a posting listed twice (a page boundary that shifted) once', async () => {
    const read = []
    const twice = [...rows(3), { id: '3', title: 'Engineer 3' }, ...rows(4).slice(3)]
    const out = await describeNew({ rows: twice, throttled: false }, spec({ read: async (r) => (read.push(r.id), { body: r.id }) }))
    expect(read).toEqual(['1', '2', '3', '4'])
    expect(out).toHaveLength(4)
  })

  it('leaves out a posting whose detail failed or came back empty', async () => {
    const read = async (r) => {
      if (r.id === '2') throw new Error('HTTP 404')
      return r.id === '3' ? null : { body: r.id }
    }
    const out = await describeNew({ rows: rows(4), throttled: false }, spec({ read }))
    expect(out.map((p) => p.externalId)).toEqual(['1', '4'])
  })

  it('stops reading at a 429 and says so', async () => {
    const adapter = {}
    const read = async (r) => {
      if (r.id === '3') throw refused()
      return { body: r.id }
    }
    const out = await describeNew({ rows: rows(6), throttled: false }, spec({ adapter, read }))
    expect(out.map((p) => p.externalId)).toEqual(['1', '2'])
    expect(adapter.note).toMatch(/429/)
  })

  it('throws when every detail failed, and not when nothing was new', async () => {
    const read = async () => { throw new Error('HTTP 500') }
    await expect(describeNew({ rows: rows(2), throttled: false }, spec({ read }))).rejects.toThrow('acme listed 2 new postings but no detail could be read')
    const context = { known: () => true }
    expect(await describeNew({ rows: rows(2), throttled: false }, spec({ read, context }))).toEqual([])
  })
})

describe('portal text', () => {
  it('joins sections as plain text under their headings, dropping empty ones', () => {
    const text = sections([['', '<p>About &amp; more</p>'], ['Empty', ''], ['Qualifications', '<ul><li>B.Tech</li></ul>']])
    expect(text).toBe('About & more\n\nQualifications\n\n- B.Tech')
  })

  it('names India where the portal did not', () => {
    expect(inIndia('Greater Noida')).toBe('Greater Noida, India')
    expect(inIndia('Hyderabad, Telangana, India')).toBe('Hyderabad, Telangana, India')
    expect(inIndia('')).toBe('India')
  })

  it('tidies a shouted city', () => {
    expect(titleCase('PUNE                     ')).toBe('Pune')
    expect(titleCase('NAVI MUMBAI(MA)')).toBe('Navi Mumbai(Ma)')
  })
})
