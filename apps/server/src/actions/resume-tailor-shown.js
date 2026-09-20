// What the career record actually shows, which is the thing a reworded
// bullet is held against. More than its prose: the record keeps a role's
// stack in its own field, so a person who listed TypeScript on that job has
// shown it. Reading the bullets alone flagged every keyword the model lifted
// out of that list and into a sentence, and refused to credit it in
// coverage, which is the opposite of what picking and rewording is for.

// One fact per line, each starting with "- ": the fact check's name rule
// (resume-names.js) reads a line opening with a dash as a bullet whose first
// word is a verb, not a name. Joining bare bullets with only a newline would
// read every bullet's opening phrase as a name instead.
export const bulletText = (bullets) => bullets.map((bullet) => `- ${bullet}`).join('\n')

// One entry's own evidence, and only its own: a skill from a different job
// must not launder into this one, for the same reason its numbers must not.
export const entryText = (entry) => [
  bulletText(entry.bullets),
  entry.title,
  entry.organisation,
  (entry.tech ?? []).join(', '),
].filter(Boolean).join('\n')

// Coverage is a whole-record question, so the skills the record lists count
// even when no bullet happens to say them out loud.
export const skillText = (profile) => [
  ...(profile.skillGroups ?? []).flatMap((group) => group.items ?? []),
  ...(profile.skills ?? []),
].join(', ')
