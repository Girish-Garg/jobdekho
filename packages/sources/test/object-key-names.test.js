import { describe, it, expect } from 'vitest'
import { decodeEntities } from '@jobdekho/sources/html-entities.js'
import { buildAdapters } from '@jobdekho/sources/registry.js'
import { toPosting } from '@jobdekho/sources/providers/oracle-posting.js'

// Names every plain object answers to with a function of its own, read out
// of scraped pages and the companies file. Each is looked up in a table of
// our own and has to miss like any unknown name.
describe('names every object answers to', () => {
  it('decodes an entity of that name like any unknown one', () => {
    expect(decodeEntities('Use the &constructor; pattern')).toBe(decodeEntities('Use the &bogus; pattern'))
    expect(decodeEntities('&amp;Constructor; &toString;')).not.toMatch(/function/)
  })

  it('builds no source for a provider, company or board of that name', () => {
    const names = ['constructor', 'toString', '__proto__', 'hasOwnProperty']
    const config = { providers: names.map((provider) => ({ provider, slug: 'x', tags: ['YC'] })), companies: names, boards: names }
    expect(buildAdapters(config)).toEqual([])
  })

  it("tags an Oracle posting only by the workplace codes Oracle sends", () => {
    const site = { publicBase: 'https://example.com' }
    const posting = toPosting({ Id: '1', Title: 'Engineer', WorkplaceTypeCode: 'constructor' }, null, { site, company: 'Acme' })
    expect(posting.tags).toEqual([])
    expect(toPosting({ Id: '2', WorkplaceTypeCode: 'ORA_REMOTE' }, null, { site, company: 'Acme' }).tags).toEqual(['Remote'])
  })
})
