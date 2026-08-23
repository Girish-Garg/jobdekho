import { eq } from 'drizzle-orm'
import { normalizeProfile } from '@jobdekho/core/profile.js'
import { userProfiles } from './schema.js'

const COLUMNS = ['skills', 'titles', 'locations', 'years', 'degree', 'resumeText', 'resumeName']

// The row carries bookkeeping the caller has no use for, and normalizeProfile
// drops anything it does not own.
export function toProfile(row) {
  if (!row) return null
  return { ...normalizeProfile(row), resumeName: row.resumeName ?? null }
}

export async function getProfile(db, userId) {
  const [row] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId))
  return toProfile(row)
}

// Kept separate from getProfile: the ranking never needs the resume text, and
// not selecting it by default keeps the raw document out of API responses.
export async function getResumeText(db, userId) {
  const [row] = await db
    .select({ resumeText: userProfiles.resumeText })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
  return row?.resumeText ?? null
}

export async function upsertProfile(db, userId, input) {
  const p = normalizeProfile(input)
  const values = {
    userId,
    skills: p.skills,
    titles: p.titles,
    locations: p.locations,
    years: p.years,
    degree: p.degree,
    resumeText: input?.resumeText ?? null,
    resumeName: input?.resumeName ?? null,
    updatedAt: new Date(),
  }
  await db.insert(userProfiles).values(values).onConflictDoUpdate({
    target: userProfiles.userId,
    set: Object.fromEntries(COLUMNS.map((c) => [c, values[c]]).concat([['updatedAt', values.updatedAt]])),
  })
  return toProfile(values)
}

export async function deleteProfile(db, userId) {
  await db.delete(userProfiles).where(eq(userProfiles.userId, userId))
}
