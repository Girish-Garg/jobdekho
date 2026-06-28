import { describe, it, expect } from 'vitest'
import { buildUserRow } from '@jobdekho/db/users.js'

describe('buildUserRow', () => {
  it('maps a google profile to an insertable row with a uuid id', () => {
    const row = buildUserRow({ googleId: 'g1', email: 'a@b.c', name: 'A', avatarUrl: 'u' })
    expect(row.googleId).toBe('g1')
    expect(row.email).toBe('a@b.c')
    expect(row.id).toMatch(/^[0-9a-f-]{36}$/)
  })
  it('defaults missing name and avatar to null', () => {
    const row = buildUserRow({ googleId: 'g2', email: 'x@y.z' })
    expect(row.name).toBeNull()
    expect(row.avatarUrl).toBeNull()
  })
})
