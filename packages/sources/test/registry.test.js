import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { buildAdapters } from '@jobdekho/sources/registry.js'
import { parseSite } from '@jobdekho/sources/providers/workday-site.js'
import { parseSite as successfactorsSite } from '@jobdekho/sources/providers/successfactors-site.js'
import { parseSite as eightfoldSite } from '@jobdekho/sources/providers/eightfold-site.js'
import { parseSite as avatureSite } from '@jobdekho/sources/providers/avature-site.js'

const config = JSON.parse(readFileSync(new URL('../../../config/companies.json', import.meta.url)))

describe('buildAdapters', () => {
  it('builds adapters from config and skips unknown names', () => {
    const adapters = buildAdapters({
      providers: [{ provider: 'greenhouse', slug: 'acme' }, { provider: 'nope', slug: 'x' }],
      companies: ['amazon', 'unknown'],
      boards: ['internshala'],
    })
    expect(adapters.map((a) => a.name)).toEqual(['greenhouse:acme', 'amazon', 'internshala'])
  })

  it('knows every multi-tenant ATS provider', () => {
    const providers = [
      'greenhouse', 'lever', 'ashby', 'smartrecruiters', 'workable', 'recruitee', 'personio', 'workday',
      'successfactors', 'oracle', 'eightfold', 'avature',
    ]
    const adapters = buildAdapters({ providers: providers.map((provider) => ({ provider, slug: 'acme' })) })
    expect(adapters.map((a) => a.name)).toEqual(providers.map((p) => `${p}:acme`))
  })

  // A Workday board is addressed by its careers site URL, and named by the
  // company written in config, so the whole entry has to reach the provider.
  it('hands a provider its whole config entry', () => {
    const [a] = buildAdapters({
      providers: [{ provider: 'workday', url: 'https://acme.wd5.myworkdayjobs.com/Careers', company: 'Acme' }],
    })
    expect(a.name).toBe('workday:acme')
  })

  // Microsoft's and EY's own adapters read endpoints that are gone; both are
  // read through their platforms now (Eightfold, SuccessFactors). Google's
  // came back, reading its careers site's results page.
  it('builds no company adapter for Microsoft or EY, and one for Google', () => {
    expect(buildAdapters({ companies: ['microsoft', 'ey'] })).toEqual([])
    expect(buildAdapters({ companies: ['google'] }).map((a) => a.name)).toEqual(['google'])
  })
})

// A typo in config/companies.json is silently dropped by buildAdapters, so the
// only way it surfaces is a count mismatch here.
describe('config/companies.json', () => {
  it('references only registered providers', () => {
    const adapters = buildAdapters(config)
    expect(adapters).toHaveLength(config.providers.length + config.companies.length + config.boards.length)
  })

  // By adapter name, which is what a posting's id is built from: two entries
  // sharing a name would write over each other's postings.
  it('has no duplicate sources', () => {
    const names = buildAdapters(config).map((a) => a.name)
    expect(names.length - new Set(names).size).toBe(0)
  })

  it('gives every provider entry a provider and a slug, or a Workday careers site URL', () => {
    for (const p of config.providers) {
      expect(typeof p.provider, JSON.stringify(p)).toBe('string')
      if (p.provider === 'workday') expect(parseSite(p.url), JSON.stringify(p)).not.toBeNull()
      else expect(p.slug, JSON.stringify(p)).toBeTruthy()
    }
  })

  // The tenant is often an abbreviation ("wf", "mmc", "hcmportal"), so the
  // name shown for a Workday company has to be written out.
  it('names the company on every Workday entry', () => {
    for (const p of config.providers.filter((e) => e.provider === 'workday')) {
      expect(p.company, JSON.stringify(p)).toBeTruthy()
    }
  })

  // Each platform reads its site from the URL, so a URL its parser cannot
  // read would only fail at scrape time, one run after another.
  it('gives every platform entry a careers site URL its provider can read', () => {
    const SITES = {
      successfactors: (p) => successfactorsSite(p.url),
      eightfold: (p) => eightfoldSite(p.url, p.domain),
      avature: (p) => avatureSite(p.url),
      oracle: (p) => (p.url.startsWith('https://') ? p.url : null),
    }
    for (const p of config.providers.filter((e) => SITES[e.provider])) {
      expect(SITES[p.provider](p), JSON.stringify(p)).not.toBeNull()
      expect(p.company, JSON.stringify(p)).toBeTruthy()
    }
  })

  it('carries the sources measured dead on 2026-09-30 no more', () => {
    const names = buildAdapters(config).map((a) => a.name)
    expect(names).not.toContain('greenhouse:postman')
    expect(names).not.toContain('lever:plivo')
    expect(names).toContain('workday:postman')
    expect(names).toContain('amazon')
  })
})

// A Y Combinator company's entry carries "YC W21"; every posting its board
// sends must carry it too, beside the board's own tags.
describe('entry tags', () => {
  it('adds an entry\'s tags to every posting its board sends, once each', async () => {
    const [a] = buildAdapters({ providers: [{ provider: 'lever', slug: 'acme', tags: ['YC W21'] }] })
    const http = async () => ({ json: async () => [{ id: 'x', text: 'Engineer', categories: { team: 'Eng' }, hostedUrl: 'u' }] })
    const [posting] = await a.fetch(http)
    expect(posting.tags).toEqual(['Eng', 'YC W21'])
    expect(a.complete).toBe(true)
  })

  it('leaves an entry without tags as it was', async () => {
    const [a] = buildAdapters({ providers: [{ provider: 'lever', slug: 'acme' }] })
    const [posting] = await a.fetch(async () => ({ json: async () => [{ id: 'x', text: 'Engineer', categories: {} }] }))
    expect(posting.tags).toEqual([])
  })

  it('knows the HN "Who is hiring" board', () => {
    expect(buildAdapters({ boards: ['hn-hiring'] }).map((a) => a.name)).toEqual(['hn-hiring'])
  })
})
