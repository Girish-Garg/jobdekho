import { describe, it, expect } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'
import { groupCountColumn, groupSourceCountColumn } from '@jobdekho/db/posting-order.js'

const dialect = new PgDialect()
const render = (col) => dialect.sqlToQuery(col).sql

describe('groupSourceCountColumn', () => {
  it('counts distinct sources rather than rows', () => {
    const sql = render(groupSourceCountColumn)
    expect(sql.toLowerCase()).toContain('count(distinct')
    expect(sql).toContain('"postings"."source"')
  })

  // A group also holds one role listed city by city under the same source, so
  // counting rows (groupCountColumn) cannot tell that apart from a genuine
  // blast. Only a DISTINCT count over sources can.
  it('partitions on the same coalesce(group_key, id) fallback as groupCountColumn', () => {
    const partition = (sql) => sql.slice(sql.indexOf('partition by'))
    expect(partition(render(groupSourceCountColumn))).toBe(partition(render(groupCountColumn)))
  })
})
