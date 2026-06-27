import { describe, it, expect } from 'vitest'
import { dedupe } from '@jobdekho/core/dedupe.js'

const p = (id) => ({ id, title: id })

describe('dedupe', () => {
  it('marks ids not seen before as fresh', () => {
    const { fresh } = dedupe([p('a'), p('b')], ['a'])
    expect(fresh.map((x) => x.id)).toEqual(['b'])
  })
  it('removes within-batch duplicates from all', () => {
    const { all } = dedupe([p('a'), p('a'), p('b')], [])
    expect(all.map((x) => x.id)).toEqual(['a', 'b'])
  })
  it('returns empty fresh when everything is known', () => {
    const { fresh } = dedupe([p('a')], ['a'])
    expect(fresh).toEqual([])
  })
})
