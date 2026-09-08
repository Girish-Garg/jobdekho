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

const RESUME_COLUMNS = ['resumeText', 'resumeName']
const PROFILE_COLUMNS = COLUMNS.filter((c) => !RESUME_COLUMNS.includes(c))

// The resume columns are written only when the caller actually carries them.
// Every column used to be overwritten on every upsert, and the profile form
// deliberately sends no resume fields, so saving hand-edited skills silently
// erased an uploaded resume - and with it the one input the cover letter and
// resume tailoring features read. Membership rather than truthiness, so a
// caller that means to clear the resume can still pass an explicit null.
const carriesResume = (input) => Boolean(input) && RESUME_COLUMNS.some((c) => c in input)

export async function upsertProfile(db, userId, input) {
  const p = normalizeProfile(input)
  const resume = carriesResume(input)
  const values = {
    userId,
    skills: p.skills,
    titles: p.titles,
    locations: p.locations,
    years: p.years,
    degree: p.degree,
    updatedAt: new Date(),
    ...(resume ? { resumeText: input.resumeText ?? null, resumeName: input.resumeName ?? null } : {}),
  }
  const columns = resume ? COLUMNS : PROFILE_COLUMNS
  // Returning the stored row rather than the values sent: when the resume
  // columns were left alone, only the database knows what they still hold, and
  // reporting them as absent would be a lie the caller shows the user.
  const [row] = await db.insert(userProfiles).values(values).onConflictDoUpdate({
    target: userProfiles.userId,
    set: Object.fromEntries(columns.map((c) => [c, values[c]]).concat([['updatedAt', values.updatedAt]])),
  }).returning()
  return toProfile(row ?? values)
}

export async function deleteProfile(db, userId) {
  await db.delete(userProfiles).where(eq(userProfiles.userId, userId))
}
