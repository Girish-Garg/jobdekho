// A level a description gives as a field: "Level: Senior Associate",
// "Seniority level: Entry level", "Career Level - IC4". Only plain level
// words are read. A company's code (IC4, B30, JL3, TCP_01) means what that
// company's ladder says (level-ladders.js), and a corporate title such as
// Associate is a different rung at every bank: Deutsche Bank's asks three
// to ten years.
const LABEL = /(?:^|\n|[|·•]\s*)[^\S\n]*((?:job |career |experience |seniority |position |role )?level|grade|band)[^\S\n]*(?::|-|\u2013)[^\S\n]*([^\n|·•]{1,50})/gi

const WORDS = [
  ['entry', /\b(?:entry[- ]?level|junior|fresher)\b/i],
  ['mid', /\b(?:mid(?:[- ]?level)?|intermediate)\b/i],
  ['senior', /\bsenior\b/i],
  ['staff', /\b(?:staff|principal)\b/i],
  ['executive', /\b(?:director|executive)\b/i],
]

const tidy = (value) => value.trim().replace(/[\s.,;]+$/, '')
const capital = (label) => label[0].toUpperCase() + label.slice(1).toLowerCase()

// [{ level, evidence, rule }] for each field whose words name one level.
// "Mid-Senior level" and "Senior Architect / Principal" name two, a range
// the field does not settle.
export function fieldsIn(description = '') {
  const found = []
  for (const m of String(description).matchAll(LABEL)) {
    const value = tidy(m[2])
    const levels = WORDS.filter(([, re]) => re.test(value)).map(([level]) => level)
    if (levels.length !== 1) continue
    found.push({ level: levels[0], evidence: `${capital(m[1])} field: ${value}`, rule: 'field' })
  }
  return found
}
