import { describe, it, expect } from 'vitest'
import { buildAdapters } from '@jobdekho/sources/registry.js'

describe('buildAdapters', () => {
  it('builds adapters from config and skips unknown names', () => {
    const adapters = buildAdapters({
      providers: [{ provider: 'greenhouse', slug: 'acme' }, { provider: 'nope', slug: 'x' }],
      companies: ['amazon', 'unknown'],
      boards: ['internshala'],
    })
    expect(adapters.map((a) => a.name)).toEqual(['greenhouse:acme', 'amazon', 'internshala'])
  })
})
