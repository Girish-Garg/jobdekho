import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync, readFileSync, statSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { openStore, FILES } from '@jobdekho/store/open.js'
import { resolveDataDir, DATA_DIR_ENV } from '@jobdekho/store/data-dir.js'
import { upsertPostings } from '@jobdekho/store/queries.js'
import { upsertProfile, getProfile, getResumeText } from '@jobdekho/store/profiles.js'
import { setPostingStatus, listPostingsForUser } from '@jobdekho/store/dashboard.js'

let dir
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-store-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

const posting = (id) => ({
  id, source: 'internshala', externalId: id, title: `Job ${id}`, company: 'Acme', url: `u/${id}`,
  descriptionSnippet: 'd', tags: [], postedAt: '2026-09-01T00:00:00.000Z',
})

describe('resolveDataDir', () => {
  it('prefers an explicit dir, then the env var, then ./data', () => {
    expect(resolveDataDir('given', { [DATA_DIR_ENV]: 'fromenv' })).toBe(resolve('given'))
    expect(resolveDataDir(undefined, { [DATA_DIR_ENV]: 'fromenv' })).toBe(resolve('fromenv'))
    expect(resolveDataDir('', {})).toBe(resolve('data'))
  })
})

describe('openStore', () => {
  it('creates the data directory on first use rather than needing a setup step', () => {
    const nested = join(dir, 'not', 'yet', 'there')
    const store = openStore(nested)
    expect(store.dir).toBe(nested)
    expect(existsSync(nested)).toBe(true)
    expect(readdirSync(nested)).toEqual([])
  })

  it('keeps the corpus and the user files in separate files', async () => {
    const store = openStore(dir)
    await upsertPostings(store, [posting('a')])
    await upsertProfile(store, 'me', { skills: ['python'], resumeText: 'RESUME', resumeName: 'cv.pdf' })
    await setPostingStatus(store, 'me', 'a', 'saved')
    expect(readdirSync(dir).sort()).toEqual([FILES.corpus, FILES.profiles, FILES.statuses].sort())
    expect(readFileSync(join(dir, FILES.corpus), 'utf8')).not.toContain('RESUME')
    expect(readFileSync(join(dir, FILES.profiles), 'utf8')).not.toContain('Job a')
  })

  it('resetting the corpus leaves the profile untouched', async () => {
    const store = openStore(dir)
    await upsertPostings(store, [posting('a'), posting('b')])
    await upsertProfile(store, 'me', { skills: ['python'], years: 2, resumeText: 'RESUME', resumeName: 'cv.pdf' })
    const before = readFileSync(join(dir, FILES.profiles), 'utf8')
    // Both ways a corpus gets reset: the file deleted by hand, or rewritten
    // empty by a tool. Neither may reach a file the user typed into.
    rmSync(join(dir, FILES.corpus))
    const reopened = openStore(dir)
    expect(reopened.corpus.rows()).toEqual([])
    expect(await getProfile(reopened, 'me')).toMatchObject({ skills: ['python'], years: 2, resumeName: 'cv.pdf' })
    expect(await getResumeText(reopened, 'me')).toBe('RESUME')
    reopened.corpus.save(new Map())
    expect(readFileSync(join(dir, FILES.profiles), 'utf8')).toBe(before)
  })

  it('saving one status does not rewrite the corpus', async () => {
    const store = openStore(dir)
    await upsertPostings(store, [posting('a')])
    const corpus = join(dir, FILES.corpus)
    const before = { ...statSync(corpus), content: readFileSync(corpus, 'utf8') }
    await setPostingStatus(store, 'me', 'a', 'applied')
    const after = statSync(corpus)
    expect(after.mtimeMs).toBe(before.mtimeMs)
    expect(readFileSync(corpus, 'utf8')).toBe(before.content)
    expect(JSON.parse(readFileSync(join(dir, FILES.statuses), 'utf8'))).toEqual({ me: { a: 'applied' } })
  })

  it('a second handle on the same directory sees what the first wrote', async () => {
    const server = openStore(dir)
    expect(await listPostingsForUser(server, 'me', { includeStale: true })).toEqual([])
    const scraper = openStore(dir)
    await upsertPostings(scraper, [posting('a')])
    const seen = await listPostingsForUser(server, 'me', { includeStale: true })
    expect(seen.map((p) => p.id)).toEqual(['a'])
  })
})
