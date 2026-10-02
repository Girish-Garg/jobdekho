import { describe, it, expect } from 'vitest'
import { normalizeLinks, entryLinks } from '@jobdekho/store/profile-links.js'
import { normalizeEntry } from '@jobdekho/store/profile-entry.js'
import { normalizeSections } from '@jobdekho/store/profile-sections.js'

describe('normalizeLinks', () => {
  it('trims, gives a bare host https://, keeps a chosen kind and detects a missing one', () => {
    expect(normalizeLinks([
      { kind: 'video', url: ' https://drive.google.com/file/d/abc ', label: '  Demo   video ' },
      { url: 'github.com/demo/cli' },
      'https://demo.vercel.app',
    ])).toEqual([
      { kind: 'video', url: 'https://drive.google.com/file/d/abc', label: 'Demo video' },
      { kind: 'code', url: 'https://github.com/demo/cli', label: '' },
      { kind: 'live', url: 'https://demo.vercel.app', label: '' },
    ])
  })

  it('drops empties, non-web addresses and repeats of an address, keeping the first', () => {
    expect(normalizeLinks([
      { kind: 'code', url: '' },
      { url: 'javascript:alert(1)' },
      { url: 'not a link' },
      { kind: 'code', url: 'https://github.com/demo/cli', label: 'Repo' },
      { kind: 'other', url: 'github.com/demo/cli', label: 'Again' },
      null, 42,
    ])).toEqual([{ kind: 'code', url: 'https://github.com/demo/cli', label: 'Repo' }])
  })

  it('reads a kind it does not know from the address instead, and a label that is not text as none', () => {
    expect(normalizeLinks([{ kind: 'hack', url: 'https://youtu.be/abc', label: { x: 1 } }]))
      .toEqual([{ kind: 'video', url: 'https://youtu.be/abc', label: '' }])
  })

  it('keeps at most twelve, and is empty for anything not a list', () => {
    const many = Array.from({ length: 20 }, (_, i) => `https://example.com/${i}`)
    expect(normalizeLinks(many)).toHaveLength(12)
    expect(normalizeLinks(many)[11].url).toBe('https://example.com/11')
    expect(normalizeLinks('https://example.com')).toEqual([])
    expect(normalizeLinks(undefined)).toEqual([])
  })

  it('caps a label and refuses an address too long to be one', () => {
    const [link] = normalizeLinks([{ url: 'https://example.com', label: 'x'.repeat(200) }])
    expect(link.label).toHaveLength(80)
    expect(normalizeLinks([`https://example.com/${'a'.repeat(2100)}`])).toEqual([])
  })
})

describe('an entry\'s links', () => {
  // The move from one link to a list happens on read: nothing rewrites
  // profile.json, and the next save writes the list.
  it('turns an old single link into a one-link list of the kind its host says', () => {
    const entry = normalizeEntry({ title: 'CLI', link: 'github.com/demo/cli' }, 0)
    expect(entry.links).toEqual([{ kind: 'code', url: 'https://github.com/demo/cli', label: '' }])
    expect(entry.link).toBe('https://github.com/demo/cli')
  })

  it('lets a list win over the old field, even an empty list', () => {
    expect(entryLinks({ links: [{ url: 'https://youtu.be/a' }], link: 'https://github.com/x' }).map((l) => l.url)).toEqual(['https://youtu.be/a'])
    expect(entryLinks({ links: [], link: 'https://github.com/x' })).toEqual([])
    expect(entryLinks({ link: '' })).toEqual([])
    expect(entryLinks({})).toEqual([])
  })

  it('keeps the old field equal to the first link, for readers still on it', () => {
    const entry = normalizeEntry({ links: [{ url: '' }, { kind: 'live', url: 'https://demo.web.app' }, { url: 'youtu.be/x' }] }, 0)
    expect(entry.link).toBe('https://demo.web.app')
    expect(normalizeEntry({}, 0)).toMatchObject({ links: [], link: '' })
  })
})

describe('the basics\' more links', () => {
  it('normalizes the extra list the same way, beside the three named links', () => {
    const { basics } = normalizeSections({ basics: { links: { github: 'github.com/demo' }, moreLinks: [{ url: 'kaggle.com/demo' }, { url: 'ftp://x' }] } })
    expect(basics.links).toEqual({ github: 'github.com/demo', linkedin: '', portfolio: '' })
    expect(basics.moreLinks).toEqual([{ kind: 'kaggle', url: 'https://kaggle.com/demo', label: '' }])
    expect(normalizeSections({}).basics.moreLinks).toEqual([])
  })
})
