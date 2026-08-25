import { describe, it, expect } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'
import { groupCountColumn, groupSourceCountColumn } from '@jobdekho/db/posting-order.js'

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
