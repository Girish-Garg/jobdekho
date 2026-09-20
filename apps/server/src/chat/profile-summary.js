// The career record's shape in the chat prompt: enough for a question like
// "am I qualified for this" to be answerable, and nothing past it. No name,
// no contact details, no resume text, no bullet-level history - this is a
// summary, not the record itself, the same restraint cover-letter-prompt.js
// applies by sending only the resume text and nothing else about the person.
export function summarizeProfile(profile) {
  if (!profile) return null
  return {
    skills: profile.skills ?? [],
    titles: profile.titles ?? [],
    years: profile.years ?? null,
    degree: profile.degree ?? 'none',
    experienceCount: profile.experience?.length ?? 0,
    projectsCount: profile.projects?.length ?? 0,
    educationCount: profile.education?.length ?? 0,
  }
}
