import { normalizeProfile } from '@jobdekho/core/profile.js'
import { toIso } from './timestamp.js'

const RESUME_FIELDS = ['resumeText', 'resumeName']

// The record carries bookkeeping the caller has no use for, and
// normalizeProfile drops anything it does not own.
export function toProfile(record) {
  if (!record) return null
  return { ...normalizeProfile(record), resumeName: record.resumeName ?? null }
}

export async function getProfile(store, userId) {
  return toProfile(store.profiles.get(userId))
}

// Kept separate from getProfile: the ranking never needs the resume text, and
// not returning it by default keeps the raw document out of API responses.
export async function getResumeText(store, userId) {
  return store.profiles.get(userId)?.resumeText ?? null
}

// The resume fields are written only when the caller actually carries them.
// Every field used to be overwritten on every upsert, and the profile form
// deliberately sends no resume fields, so saving hand-edited skills silently
// erased an uploaded resume - and with it the one input the cover letter and
// resume tailoring features read. Membership rather than truthiness, so a
// caller that means to clear the resume can still pass an explicit null.
const carriesResume = (input) => Boolean(input) && RESUME_FIELDS.some((c) => c in input)

export async function upsertProfile(store, userId, input) {
  const p = normalizeProfile(input)
  const current = store.profiles.get(userId) ?? { resumeText: null, resumeName: null }
  const record = {
    ...current,
    skills: p.skills, titles: p.titles, locations: p.locations, years: p.years, degree: p.degree,
    ...(carriesResume(input)
      ? { resumeText: input.resumeText ?? null, resumeName: input.resumeName ?? null }
      : {}),
    updatedAt: toIso(new Date()),
  }
  store.profiles.set(userId, record)
  // Returning the stored record rather than the values sent: when the resume
  // fields were left alone, only the file knows what they still hold, and
  // reporting them as absent would be a lie the caller shows the user.
  return toProfile(record)
}

export async function deleteProfile(store, userId) {
  store.profiles.remove(userId)
}
