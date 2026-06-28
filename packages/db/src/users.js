import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { users } from './schema.js'

export function buildUserRow(profile) {
  return {
    id: randomUUID(),
    googleId: profile.googleId,
    email: profile.email,
    name: profile.name ?? null,
    avatarUrl: profile.avatarUrl ?? null,
  }
}

export function createUserStore(db) {
  return {
    async upsertUser(profile) {
      const found = await db.select().from(users).where(eq(users.googleId, profile.googleId))
      if (found[0]) return found[0]
      const inserted = await db.insert(users).values(buildUserRow(profile)).returning()
      return inserted[0]
    },
    async getUserById(id) {
      const found = await db.select().from(users).where(eq(users.id, id))
      return found[0] || null
    },
  }
}
