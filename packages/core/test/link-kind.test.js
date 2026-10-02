import { describe, it, expect } from 'vitest'
import { LINK_KINDS, LINK_KIND_NAMES, LINK_HOSTS, linkKind, linkName, webAddress } from '@jobdekho/core/link-kind.js'

describe('linkKind', () => {
  it('reads the kind from the host, with or without a scheme or a subdomain', () => {
    const cases = {
      'https://github.com/demo/cli': 'code',
      'github.com/demo/cli': 'code',
      'https://gist.github.com/demo/1': 'code',
      'gitlab.com/demo/app': 'code',
      'https://bitbucket.org/demo/app': 'code',
      'https://www.youtube.com/watch?v=abc': 'video',
      'youtu.be/abc': 'video',
      'https://vimeo.com/123': 'video',
      'https://www.loom.com/share/abc': 'video',
      'https://www.figma.com/file/abc/App': 'figma',
      'https://www.behance.net/demo': 'design',
      'dribbble.com/demo': 'design',
      'https://drive.google.com/file/d/abc/view': 'drive',
      'https://docs.google.com/presentation/d/abc': 'drive',
      'https://www.kaggle.com/code/demo/eda': 'kaggle',
      'https://photos.google.com/share/abc': 'photos',
      'https://www.flickr.com/photos/demo': 'photos',
      'imgur.com/a/abc': 'photos',
      'https://www.instagram.com/demo': 'photos',
      'https://arxiv.org/abs/2401.00001': 'paper',
      'https://doi.org/10.1000/xyz': 'paper',
      'https://example.com/thesis.PDF': 'paper',
      'https://demo.github.io/portfolio': 'live',
      'https://app-demo.vercel.app': 'live',
      'demo.netlify.app': 'live',
      'https://demo.pages.dev': 'live',
      'https://demo-api.herokuapp.com': 'live',
      'https://demo.dev': 'other',
      'https://leetcode.com/u/demo': 'other',
    }
    for (const [url, kind] of Object.entries(cases)) expect([url, linkKind(url)]).toEqual([url, kind])
  })

  it('matches a whole host, never a look-alike that only ends the same way', () => {
    expect(linkKind('https://notgithub.com/x')).toBe('other')
    expect(linkKind('https://github.com.evil.example/x')).toBe('other')
  })

  it('calls anything that is not a web address "other"', () => {
    for (const value of ['', null, undefined, 'my repo', 'javascript:alert(1)', 'mailto:demo@example.com']) {
      expect(linkKind(value)).toBe('other')
    }
  })

  it('names a kind for every rule, and only kinds it lists', () => {
    expect(Object.keys(LINK_KIND_NAMES)).toEqual(LINK_KINDS)
    for (const [kind] of LINK_HOSTS) expect(LINK_KINDS).toContain(kind)
  })
})

describe('webAddress', () => {
  it('keeps http and https addresses as written, and gives a bare host https://', () => {
    expect(webAddress('  https://github.com/Demo/CLI ')).toBe('https://github.com/Demo/CLI')
    expect(webAddress('http://example.com')).toBe('http://example.com')
    expect(webAddress('github.com/demo')).toBe('https://github.com/demo')
    expect(webAddress('www.example.com:8080/a?b=c#d')).toBe('https://www.example.com:8080/a?b=c#d')
  })

  it('refuses every other scheme and anything that is not an address', () => {
    for (const value of ['javascript:alert(1)', 'data:text/html,x', 'file:///C:/x', 'ftp://example.com', 'mailto:a@b.c',
      '//example.com', 'https://', 'not a link', 'example', 'https://exa mple.com', 'https://x.dev/\u0000a', '', null]) {
      expect(webAddress(value)).toBe('')
    }
  })
})

describe('linkName', () => {
  it('is the label when there is one, else the kind, and "Link" for an unlabelled other', () => {
    expect(linkName({ kind: 'video', label: ' Demo video ' })).toBe('Demo video')
    expect(linkName({ kind: 'code', label: '' })).toBe('Code')
    expect(linkName({ kind: 'other', label: '' })).toBe('Link')
    expect(linkName({ kind: 'constructor' })).toBe('Link')
    expect(linkName(null)).toBe('Link')
  })
})
