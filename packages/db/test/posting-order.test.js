import { describe, it, expect } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'
import { groupCountColumn, groupSourceCountColumn, groupRankColumn } from '@jobdekho/db/posting-order.js'

const dialect = new PgDialect()
const render = (col) => dialect.sqlToQuery(col).sql

describe('groupSourceCountColumn', () => {
  // This shipped as count(distinct source) over (...), which Postgres rejects
  // outright: "DISTINCT is not implemented for window functions", SQLSTATE
  // 0A000. It reached a running server because SQL is only text until Postgres
  // parses it, and nothing here parses it. The bug cannot be caught from this
  // side, so what is guarded is the shape known to be rejected.
  it('never asks a window function for a DISTINCT count', () => {
    expect(render(groupSourceCountColumn).toLowerCase()).not.toContain('distinct')
  })

  // Ranking the sources both ways and adding the ranks gives every row in the
  // partition the same total, one more than the number of distinct sources.
  it('counts distinct sources by pairing an ascending and a descending rank', () => {
    const sql = render(groupSourceCountColumn).toLowerCase()
    expect(sql.match(/dense_rank\(\)/g)).toHaveLength(2)
    expect(sql).toContain('order by "postings"."source" asc')
    expect(sql).toContain('order by "postings"."source" desc')
    expect(sql).toContain('- 1')
  })

  // A group also holds one role listed city by city under the same source, so
  // counting rows (groupCountColumn) cannot tell that apart from a genuine
  // blast across boards. Both windows must partition exactly as that one does,
  // or the two counts describe different groups.
  it('partitions on the same coalesce(group_key, id) fallback as groupCountColumn', () => {
    const partitionOf = (sql) => sql.slice(sql.indexOf('partition by'), sql.indexOf(')', sql.indexOf('partition by')))
    const shared = partitionOf(render(groupCountColumn))
    expect(shared).toContain('coalesce')
    expect(render(groupSourceCountColumn).split(shared)).toHaveLength(3)
  })
})

describe('groupRankColumn', () => {
  // An aggregator reprints a role the employer already published. When both
  // land in one group the direct posting has to be the one shown: its link
  // goes to the employer rather than through a redirector, and its body is
  // the full ad. A company board is named "provider:slug" and an aggregator
  // is named by itself, so the colon already carries that distinction.
  it('ranks a company board above an aggregator inside a group', () => {
    const sql = render(groupRankColumn).toLowerCase()
    expect(sql).toContain("like '%:%'")
    expect(sql.indexOf("like '%:%'")).toBeLessThan(sql.indexOf('posted_at'))
  })

  // Recency still decides between two postings of the same kind, and id still
  // breaks a tie, or a whole band would come back in arbitrary order.
  it('keeps recency and the id tiebreak after the source preference', () => {
    const sql = render(groupRankColumn).toLowerCase()
    expect(sql).toContain('posted_at" desc nulls last')
    expect(sql.indexOf('posted_at')).toBeLessThan(sql.lastIndexOf('id" desc'))
  })

  // groupCountColumn is written on one line and this one over several, so the
  // comparison is on the clause rather than on its formatting.
  it('partitions on the same coalesce fallback as the other window columns', () => {
    const partition = (s) => s.replace(/\s+/g, ' ')
      .slice(s.replace(/\s+/g, ' ').indexOf('partition by'))
      .replace(/ order by.*/, '')
      .replace(/\).*/, '')
      .trim()
    expect(partition(render(groupRankColumn))).toBe(partition(render(groupCountColumn)))
    expect(partition(render(groupRankColumn))).toContain('coalesce')
  })
})
