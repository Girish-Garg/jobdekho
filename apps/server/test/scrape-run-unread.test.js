import { describe, it, expect, vi } from 'vitest'
import { scrapeRunner } from '@jobdekho/server/scrape/run.js'

// The scraper leaves out a posting its rules threw on (see its pipeline.js);
// the refresh still finishes, and the terminal says which posting it was.
describe('the server refresh with a posting the rules could not read', () => {
  it('finishes and logs the posting it left out', async () => {
    const error = new TypeError('a rule broke')
    const unread = [{ source: 'yc', title: 'Software Engineer', company: 'Constructor', error }]
    const out = { fresh: 1, total: 1, tooOld: 0, removed: 0, results: [], unread }
    const log = { warn: vi.fn() }
    const run = scrapeRunner({}, { load: async () => ({ runScrape: async () => out }), log })
    expect(await run({ onProgress: () => {} })).toMatchObject({ fresh: 1, failed: [] })
    expect(log.warn).toHaveBeenCalledWith(
      { err: error, source: 'yc', title: 'Software Engineer', company: 'Constructor' },
      'A posting could not be read and was left out of this refresh',
    )
  })
})
