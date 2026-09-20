// The career record's own paragraph in the prompt, plain prose rather than
// fenced JSON: it is the person's own data, not third-party text, so there is
// nothing here to warn the model away from trusting.
export function profileBlock(profile) {
  if (!profile) return 'The person has not filled in a career record yet.\n\n'
  const skills = profile.skills.length ? profile.skills.join(', ') : 'none listed'
  const titles = profile.titles.length ? profile.titles.join(', ') : 'none listed'
  const years = profile.years ?? 'an unknown number of'
  return `The person's career record: skills ${skills}; target titles ${titles}; `
    + `${years} years of experience; highest degree ${profile.degree}; `
    + `${profile.experienceCount} work entries, ${profile.projectsCount} projects, `
    + `${profile.educationCount} education entries.\n\n`
}
