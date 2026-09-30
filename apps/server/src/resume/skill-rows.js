// The Skills section's rows. A record can hold its skills two ways: named
// groups written for the resume, and the flat list the fit is scored on
// (often the only one filled, since the fit needs it and a resume upload
// fills it). A resume used to print the groups alone, so a person with only
// the flat list got no Skills section at all; the list is one row then.
//
// `lead` is what a tailoring plan found the posting asks for and the record
// shows (the plan's keywords.used): those move to the front of their row, in
// the record's own spelling, so the first skills a recruiter reads are the
// ones the job named. Nothing is added that the record does not hold.
const key = (text) => String(text).trim().toLowerCase()

function leading(items, lead) {
  const wanted = new Set(lead.map(key))
  return [...items.filter((item) => wanted.has(key(item))), ...items.filter((item) => !wanted.has(key(item)))]
}

export function skillRows({ skillGroups = [], skills = [] }, lead = []) {
  const groups = skillGroups.filter((group) => group.items?.length)
  if (groups.length) return groups.map((group) => ({ ...group, items: leading(group.items, lead) }))
  const flat = [...new Set(skills.map((skill) => String(skill).trim()).filter(Boolean))]
  return flat.length ? [{ name: 'Skills', items: leading(flat, lead) }] : []
}
