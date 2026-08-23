import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { buildAdapters } from '@jobdekho/sources/registry.js'

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
    const providers = ['greenhouse', 'lever', 'ashby', 'smartrecruiters', 'workable', 'recruitee', 'personio']
    const adapters = buildAdapters({ providers: providers.map((provider) => ({ provider, slug: 'acme' })) })
    expect(adapters.map((a) => a.name)).toEqual(providers.map((p) => `${p}:acme`))
  })
})

// A typo in config/companies.json is silently dropped by buildAdapters, so the
// only way it surfaces is a count mismatch here.
describe('config/companies.json', () => {
  it('references only registered providers', () => {
    const adapters = buildAdapters(config)
    expect(adapters).toHaveLength(config.providers.length + config.companies.length + config.boards.length)
  })

  it('has no duplicate boards', () => {
    const keys = config.providers.map((p) => `${p.provider}:${p.slug}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('gives every provider entry a provider and a slug', () => {
    for (const p of config.providers) {
      expect(typeof p.provider, JSON.stringify(p)).toBe('string')
      expect(p.slug, JSON.stringify(p)).toBeTruthy()
    }
  })
})
