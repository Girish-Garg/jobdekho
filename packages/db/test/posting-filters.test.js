import { describe, it, expect } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'
import {
  escapeLike, clampPage, allowedDegrees, postingConditions, freshCondition,
} from '@jobdekho/db/posting-filters.js'

const dialect = new PgDialect()
const render = (cond) => dialect.sqlToQuery(cond)

describe('escapeLike', () => {
  it('leaves plain strings unchanged', () => {
    expect(escapeLike('react')).toBe('react')
  })
  it('escapes percent signs', () => {
    expect(escapeLike('50%')).toBe('50\\%')
  })
  it('escapes underscores', () => {
    expect(escapeLike('foo_bar')).toBe('foo\\_bar')
  })
  it('escapes backslashes', () => {
    expect(escapeLike('a\\b')).toBe('a\\\\b')
  })
  it('escapes all special chars together', () => {
    expect(escapeLike('%_\\')).toBe('\\%\\_\\\\')
  })
})

describe('clampPage', () => {
  it('defaults to 500 rows from the start', () => {
    expect(clampPage({})).toEqual({ limit: 500, offset: 0 })
  })
  it('defaults when called with no argument', () => {
    expect(clampPage()).toEqual({ limit: 500, offset: 0 })
  })
  it('keeps a limit inside the allowed range', () => {
    expect(clampPage({ limit: 25, offset: 50 })).toEqual({ limit: 25, offset: 50 })
  })
  it('clamps a limit above the maximum to 1000', () => {
    expect(clampPage({ limit: 99999 }).limit).toBe(1000)
  })
  it('falls back to the default for zero, negative and non-numeric limits', () => {
    expect(clampPage({ limit: 0 }).limit).toBe(500)
    expect(clampPage({ limit: -10 }).limit).toBe(500)
    expect(clampPage({ limit: 'abc' }).limit).toBe(500)
  })
  it('floors a negative or non-numeric offset to zero', () => {
    expect(clampPage({ offset: -5 }).offset).toBe(0)
    expect(clampPage({ offset: 'abc' }).offset).toBe(0)
  })
  it('truncates fractional values', () => {
    expect(clampPage({ limit: 10.9, offset: 3.7 })).toEqual({ limit: 10, offset: 3 })
  })
  it('accepts numeric strings from the query string', () => {
    expect(clampPage({ limit: '20', offset: '40' })).toEqual({ limit: 20, offset: 40 })
  })
})

describe('allowedDegrees', () => {
  it('returns every degree at or below the one held', () => {
    expect(allowedDegrees('bachelors')).toEqual(['none', 'bachelors'])
    expect(allowedDegrees('masters')).toEqual(['none', 'bachelors', 'masters'])
  })
  it('returns the whole ladder for a phd holder', () => {
    expect(allowedDegrees('phd')).toEqual(['none', 'bachelors', 'masters', 'phd'])
  })
  it('returns only "none" for a seeker holding no degree', () => {
    expect(allowedDegrees('none')).toEqual(['none'])
  })
  it('treats an unknown degree as the bottom of the ladder', () => {
    expect(allowedDegrees('bootcamp')).toEqual(['none'])
  })
})

describe('freshness', () => {
  // On by default: a posting the adapters stopped returning has almost
  // certainly closed, and showing it as live is worse than hiding it.
  it('filters out stale rows unless asked not to', () => {
    expect(postingConditions({})).toHaveLength(1)
    expect(render(postingConditions({})[0]).sql).toContain('last_seen_at')
    expect(postingConditions({ includeStale: true })).toEqual([])
  })

  // Rows predating the column read as NULL. Absent evidence of freshness is
  // not evidence of staleness, so they stay visible.
  it('keeps rows that never recorded a last seen time', () => {
    expect(render(freshCondition()).sql).toContain('is null')
  })
})

describe('postingConditions', () => {
  it('returns no conditions when no options are given', () => {
    expect(postingConditions({ includeStale: true })).toEqual([])
    expect(postingConditions({ includeStale: true })).toEqual([])
  })

  it('builds an equality condition for source', () => {
    const [cond] = postingConditions({ includeStale: true, source: 'naukri' })
    expect(render(cond).params).toEqual(['naukri'])
    expect(render(cond).sql).toContain('"source" =')
  })

  it('builds an IN condition for a sources multi-select', () => {
    const [cond] = postingConditions({ includeStale: true, sources: ['internshala', 'unstop'] })
    const { sql, params } = render(cond)
    expect(sql).toContain('in')
    expect(params).toEqual(['internshala', 'unstop'])
  })

  // The multi-select supersedes the older single-value param when both arrive.
  it('prefers sources over source', () => {
    const conds = postingConditions({ includeStale: true, source: 'naukri', sources: ['internshala'] })
    expect(conds).toHaveLength(1)
    expect(render(conds[0]).params).toEqual(['internshala'])
  })

  it('falls back to source when sources is empty', () => {
    const [cond] = postingConditions({ includeStale: true, source: 'naukri', sources: [] })
    expect(render(cond).params).toEqual(['naukri'])
  })

  // Stored as an exclude list so a board added to the config later is included
  // automatically rather than silently left out of an old saved filter.
  it('builds a NOT IN condition for excludedSources', () => {
    const [cond] = postingConditions({ includeStale: true, excludedSources: ['unstop'] })
    const { sql, params } = render(cond)
    expect(sql).toContain('not in')
    expect(params).toEqual(['unstop'])
  })

  it('combines an exclude list with other conditions', () => {
    expect(postingConditions({ includeStale: true, excludedSources: ['a'], q: 'react' })).toHaveLength(2)
  })

  it('filters work modes and treats a null column as onsite', () => {
    const [remoteOnly] = postingConditions({ includeStale: true, workModes: ['remote'] })
    expect(render(remoteOnly).params).toEqual(['remote'])
    // onsite is the default reading, so asking for it must also match NULLs.
    const [withOnsite] = postingConditions({ includeStale: true, workModes: ['onsite'] })
    expect(render(withOnsite).sql).toContain('is null')
  })

  it('builds an escaped title/company search for q', () => {
    const [cond] = postingConditions({ includeStale: true, q: '50%' })
    const { sql, params } = render(cond)
    expect(sql).toContain('ilike')
    expect(params).toEqual(['%50\\%%', '%50\\%%'])
  })

  it('builds an IN condition for levels', () => {
    const [cond] = postingConditions({ includeStale: true, levels: ['senior', 'staff'] })
    const { sql, params } = render(cond)
    expect(sql).toContain('"level" in')
    expect(sql).not.toContain('is null')
    expect(params).toEqual(['senior', 'staff'])
  })

  it('also matches NULL level when the wanted set contains mid', () => {
    const [cond] = postingConditions({ includeStale: true, levels: ['mid'] })
    const { sql, params } = render(cond)
    expect(sql).toContain('"level" in')
    expect(sql).toContain('"level" is null')
    expect(params).toEqual(['mid'])
  })

  it('ignores an empty levels array', () => {
    expect(postingConditions({ includeStale: true, levels: [] })).toEqual([])
  })

  it('expands maxDegree into the reachable degree set', () => {
    const [cond] = postingConditions({ includeStale: true, maxDegree: 'bachelors' })
    const { sql, params } = render(cond)
    expect(sql).toContain('"degree_min" in')
    expect(params).toEqual(['none', 'bachelors'])
  })

  it('always lets a NULL degree_min through, since none is always reachable', () => {
    const [cond] = postingConditions({ includeStale: true, maxDegree: 'none' })
    expect(render(cond).sql).toContain('"degree_min" is null')
  })

  it('ignores a null maxDegree', () => {
    expect(postingConditions({ includeStale: true, maxDegree: null })).toEqual([])
  })

  it('matches status in SQL so paging cannot drop actioned rows', () => {
    const [cond] = postingConditions({ includeStale: true, status: 'saved' })
    const { sql, params } = render(cond)
    expect(sql).toContain('"user_postings"."status" =')
    expect(params).toEqual(['saved'])
  })

  it('treats a null status as "not yet actioned"', () => {
    const [cond] = postingConditions({ includeStale: true, status: null })
    expect(render(cond).sql).toContain('"user_postings"."status" is null')
  })

  it('adds no status condition when status is undefined', () => {
    expect(postingConditions({ includeStale: true, status: undefined })).toEqual([])
  })

  // Six, not five: freshness is applied unless the caller opts out.
  it('combines every condition', () => {
    const conds = postingConditions({
      source: 'naukri', q: 'react', levels: ['entry'], maxDegree: 'masters', status: 'saved',
    })
    expect(conds).toHaveLength(6)
  })
})

describe('numeric measure filters', () => {
  const one = (opts) => render(postingConditions({ includeStale: true, ...opts })[0])

  it('applies a stipend floor', () => {
    const { sql, params } = one({ minStipend: 15000 })
    expect(sql).toContain('"stipend_min" >=')
    expect(params).toEqual([15000])
  })

  it('applies duration and experience ceilings', () => {
    expect(one({ maxDurationMonths: 6 }).sql).toContain('"duration_months" <=')
    expect(one({ maxExperienceYears: 2 }).sql).toContain('"experience_years" <=')
  })

  // A posting with no stated pay cannot be shown to clear a floor, so NULL
  // fails. An unstated experience requirement is not a barrier, so NULL passes.
  it('is strict about unknown pay and lenient about unknown experience', () => {
    expect(one({ minStipend: 15000 }).sql).not.toContain('is null')
    expect(one({ maxExperienceYears: 2 }).sql).toContain('is null')
  })

  it('ignores non-numeric values from a query string', () => {
    expect(postingConditions({ includeStale: true, minStipend: undefined })).toEqual([])
    expect(postingConditions({ includeStale: true, minStipend: NaN })).toEqual([])
    expect(postingConditions({ includeStale: true, minStipend: '' })).toEqual([])
    expect(postingConditions({ includeStale: true, minStipend: 'abc' })).toEqual([])
  })

  // Query params arrive as strings. Number.isFinite('1') is false, so checking
  // the raw value dropped every measure filter instead of applying it, and
  // "Paid only" quietly returned unpaid postings.
  it('applies a measure filter given as a string', () => {
    for (const key of ['minStipend', 'maxDurationMonths', 'maxExperienceYears']) {
      expect(postingConditions({ includeStale: true, [key]: '1' })).toHaveLength(1)
    }
  })

  it('treats a string and a number identically', () => {
    const asText = render(postingConditions({ includeStale: true, minStipend: '5000' })[0])
    const asNum = render(postingConditions({ includeStale: true, minStipend: 5000 })[0])
    expect(asText.sql).toBe(asNum.sql)
    expect(asText.params).toEqual(asNum.params)
  })
})
