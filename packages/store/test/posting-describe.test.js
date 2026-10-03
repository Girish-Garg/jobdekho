import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore } from '@jobdekho/store/open.js'
import { saveDescription } from '@jobdekho/store/posting-describe.js'
import { TAGS_VERSION } from '@jobdekho/core/tag.js'

let dir
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-describe-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

// A LinkedIn card stored with no text, as a sweep leaves the ones it did
// not describe.
const card = {
  id: 'li1', source: 'linkedin', externalId: '4400000001', title: 'Back End Developer', company: 'Thinknova',
  location: 'India', url: 'https://www.linkedin.com/jobs/view/4400000001', descriptionSnippet: '', descriptionText: '',
  tags: [], postedAt: '2026-10-01T00:00:00.000Z', firstSeenAt: '2026-10-01T00:00:00.000Z', lastSeenAt: '2026-10-03T00:00:00.000Z',
  stipend: null, level: null, type: 'job', workMode: null, tagsVersion: TAGS_VERSION,
  board: { type: null, employment: null, workMode: null },
}

function seeded(rows) {
  const store = openStore(dir)
  store.corpus.save(new Map(rows.map((r) => [r.id, r])))
  return store
}

const PAGE = {
  description: 'Duration: 3 months\nStipend: ₹12,000 per month\nType: Paid, remote internship\nRequirements:\n- Node.js',
  level: 'internship', employment: 'Internship', url: 'https://careers.thinknova.example/77',
}

describe('saveDescription', () => {
  it('stores the text and tags the posting again from it', () => {
    const store = seeded([card])
    const saved = saveDescription(store, 'li1', PAGE)
    expect(saved).toMatchObject({
      descriptionText: PAGE.description, url: PAGE.url,
      level: 'internship', levelTag: { from: 'board', evidence: 'Employment type: Internship' }, type: 'internship',
      stipend: '₹12,000 /month', currency: 'INR', payTag: { from: 'text' },
      board: { type: 'internship', employment: 'Internship', workMode: null },
    })
    expect(saved.descriptionSnippet).toMatch(/^Duration: 3 months Stipend/)
    expect(saved.features.skills).toMatchObject({ node: 'req' })
    // When it was seen stays the board's list's to say.
    expect(saved).toMatchObject({ firstSeenAt: card.firstSeenAt, lastSeenAt: card.lastSeenAt, title: card.title })
  })

  it('writes the corpus, so the next read has it', () => {
    const store = seeded([card])
    saveDescription(store, 'li1', PAGE)
    expect(openStore(dir).corpus.byId().get('li1').descriptionText).toBe(PAGE.description)
  })

  it('keeps the board fields the row already had when the page has none', () => {
    const store = seeded([{ ...card, board: { type: 'job', employment: 'Full-time', workMode: null } }])
    const saved = saveDescription(store, 'li1', { description: 'This is a paid internship for analysts.' })
    expect(saved.level).toBeNull()
    expect(saved.typeTag).toMatchObject({ value: 'job', from: 'board' })
  })

  it('saves nothing for a posting gone from the corpus or a page with no text', () => {
    const store = seeded([card])
    expect(saveDescription(store, 'gone', PAGE)).toBeNull()
    expect(saveDescription(store, 'li1', { description: '  ' })).toBeNull()
    expect(store.corpus.byId().get('li1').descriptionText).toBe('')
  })
})
