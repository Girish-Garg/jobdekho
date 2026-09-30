import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseHiring } from '@jobdekho/sources/boards/hn-parse.js'
import { placeOf } from '@jobdekho/sources/boards/hn-place.js'
import { hnHiring, recentThreads } from '@jobdekho/sources/boards/hn-hiring.js'

// Three real top-level posts from "Ask HN: Who is hiring? (September 2026)"
// and the thread search, as hn.algolia.com returned them on 2026-09-30.
const load = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'))
const thread = load('hn-whoishiring.json')
const search = load('hn-whoishiring-search.json')
const [noida, worldwide, supero] = thread.children

describe('parseHiring', () => {
  it('reads an onsite post in India', () => {
    const p = parseHiring(noida)
    expect(p).toMatchObject({ externalId: '49523558', company: 'Stpkr Technologies', location: 'Noida, India (Delhi NCR)', title: 'Multiple roles' })
    expect(p.postedAt).toBe('2026-09-01T15:44:46.000Z')
    expect(p.tags).toEqual(['HN Who is hiring'])
    expect(p.description).toContain('Stpkr Technologies is hiring')
  })

  it('reads a remote post open worldwide', () => {
    const p = parseHiring(worldwide)
    expect(p).toMatchObject({ company: 'We The Flywheel', location: 'REMOTE (worldwide)', title: 'AI-Native Engineers & Operators' })
  })

  // The link out is the company's own page for the role; HN is only where
  // the post was found.
  it('links out to the company when the post does, decoding its escaped slashes', () => {
    const p = parseHiring(supero)
    expect(p.url).toBe('https://www.supero.dev/careers/cloud-platform-engineer/')
    expect(p.location).toContain('Bengaluru')
    expect(p.title).toBe('Cloud / Platform Engineer')
  })

  it('falls back to the post on HN when it links nowhere else', () => {
    const p = parseHiring({ ...noida, text: 'Acme | Backend Engineer | Bengaluru | ONSITE<p>See https:&#x2F;&#x2F;news.ycombinator.com&#x2F;item?id=1' })
    expect(p.url).toBe('https://news.ycombinator.com/item?id=49523558')
  })

  it('tags a Y Combinator company by its batch', () => {
    const p = parseHiring({ ...noida, text: 'Enveritas (YC S18) | Backend Engineer | Remote (Global)<p>Hello' })
    expect(p.company).toBe('Enveritas')
    expect(p.tags).toEqual(['HN Who is hiring', 'YC S18'])
    const more = parseHiring({ ...noida, text: 'Enveritas (YC S18, non-profit) | Backend Engineer | Remote (Global)<p>Hello' })
    expect(more.company).toBe('Enveritas')
    expect(more.tags).toEqual(['HN Who is hiring', 'YC S18'])
  })

  it('skips a post locked to another region, one without the header, and one deleted', () => {
    expect(parseHiring({ ...noida, text: 'Acme | Engineer | REMOTE (US only) | Full-time<p>Hi' })).toBeNull()
    expect(parseHiring({ ...noida, text: 'Acme | Engineer | REMOTE<p>You must be a US citizen.' })).toBeNull()
    expect(parseHiring({ ...noida, text: 'We are hiring engineers in Pune, write to us' })).toBeNull()
    expect(parseHiring({ id: 1, text: null, author: null })).toBeNull()
  })
})

describe('placeOf', () => {
  const header = (text) => text.split('|').map((part) => part.trim())

  it('keeps India and reachable remote, and says where', () => {
    expect(placeOf(['Acme', 'Engineer', 'Hyderabad'], '')).toEqual({ keep: true, location: 'Hyderabad, India' })
    expect(placeOf(['Acme', 'Engineer', 'REMOTE'], 'Work from anywhere.')).toEqual({ keep: true, location: 'REMOTE' })
    expect(placeOf(['Acme', 'Engineer', 'San Francisco'], '')).toEqual({ keep: false, location: '' })
  })

  // Headers shaped like ones in the September 2026 thread.
  it('leaves out remote work within a place outside India', () => {
    for (const text of [
      'Acme | Chicago, IL / Remote | Full-Time',
      'Acme | REMOTE | Seattle or Denver metros',
      'Acme | Engineer | NYC or Remote',
      'Acme | USA/Canada: REMOTE | Full-Time',
      'Acme | Engineer | REMOTE (AUS)',
      'Acme | Remote | EMEA, North America',
      'Acme | Engineers (Americas) | REMOTE',
      'Acme | Engineer | REMOTE (all remote) | Hiring GMT-8 to GMT+2',
      'Acme | Engineer | Remote | Stockholm, Sweden',
    ]) expect(placeOf(header(text), '').keep, text).toBe(false)
  })

  it('leaves out a region lock, set hours far from India, and work only partly remote', () => {
    for (const text of [
      'Acme | Engineer | REMOTE (anywhere, EST hours)',
      'Acme | Engineer | Fully REMOTE (Poland or Romania residents only)',
      'Acme | Engineer | Remote-first with PST overlap',
      'Acme | Engineer | ONSITE or PARTIALLY REMOTE',
      'Acme | Engineer | Hybrid (Remote Possible)',
    ]) expect(placeOf(header(text), '').keep, text).toBe(false)
    expect(placeOf(header('Acme | Engineer | REMOTE'), 'Remote, but you must be based in the U.S.').keep).toBe(false)
  })

  it('keeps remote work open everywhere or anywhere India is named, and a company named after a city', () => {
    for (const text of [
      'Acme | Engineer | Remote (async)',
      'Acme | Engineer | Remote(Everywhere)',
      'Acme | Engineer | REMOTE | Worldwide',
      'Acme | Engineer | Remote (NYC / SEA / global overlap)',
      'Acme | Engineers | REMOTE (US/Canada/UK/India)',
      'Boston Robotics | Engineer | REMOTE',
      'Acme | Engineer | Remote | Join us',
    ]) expect(placeOf(header(text), '').keep, text).toBe(true)
  })

  it('reads India in the body only when the header names nowhere else', () => {
    expect(placeOf(header('Acme | Engineer | REMOTE'), 'Our team sits in Pune.')).toEqual({ keep: true, location: 'India' })
    expect(placeOf(header('Acme | Engineer | NYC | ONSITE'), 'We serve clinics in the US and India.').keep).toBe(false)
  })
})

describe('the title of an HN post', () => {
  it('is never a place or a bare web address, and is plain when the header names no role', () => {
    const post = (text) => parseHiring({ id: 7, author: 'a', created_at: '2026-09-01T00:00:00Z', text })
    expect(post('Acme | acme.io | Backend Engineer | Remote (worldwide)').title).toBe('Backend Engineer')
    expect(post('Acme | Berlin, Germany | Multiple roles | REMOTE (worldwide)').title).toBe('Multiple roles')
    expect(post('Acme | https://acme.io | REMOTE (worldwide)').title).toBe('Open roles')
  })
})

describe('hnHiring', () => {
  // Early September: August's thread is still recent; by the 30th it is not.
  const now = () => Date.parse('2026-09-05T12:00:00Z')

  it('reads the recent "Who is hiring" threads only, never "Who wants to be hired"', () => {
    expect(recentThreads(search.hits, now())).toEqual(['49522897', '49156683'])
    expect(recentThreads(search.hits, Date.parse('2026-09-30T12:00:00Z'))).toEqual(['49522897'])
    expect(recentThreads(search.hits, Date.parse('2026-12-30T00:00:00Z'))).toEqual([])
  })

  it('turns each thread\'s posts for India into postings, and keeps one thread when the other fails', async () => {
    const http = async (url) => {
      if (url.includes('search_by_date')) return { json: async () => search }
      if (url.endsWith('/49522897')) return { json: async () => thread }
      throw new Error('HTTP 503 for ' + url)
    }
    const rows = await hnHiring({ now }).fetch(http)
    expect(rows.map((r) => r.externalId)).toEqual(['49523558', '49522930', '49573833'])
  })
})
