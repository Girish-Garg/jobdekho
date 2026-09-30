import { phoneForms } from './phone-format.js'

// The facts an application asks for, from the person's JobDekho profile and
// from nothing else: never invented, never taken from the page. A value the
// profile does not have is left out, and its field is left for the person.
const str = (value) => (value === null || value === undefined ? '' : String(value).trim())

// A form wants https://; profiles hold links as people paste them.
const asUrl = (value) => {
  const text = str(value)
  if (!text) return ''
  return /^https?:\/\//i.test(text) ? text : `https://${text.replace(/^\/+/, '')}`
}

// "Pune, India" gives the city first and the country last. Names split on
// the last space, which is right for most names written in full and a guess
// for one-word or very long names: those are flagged for the person to check.
export function splitName(name) {
  const parts = str(name).split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { first: '', last: '', check: false }
  if (parts.length === 1) return { first: parts[0], last: '', check: true }
  return { first: parts.slice(0, -1).join(' '), last: parts.at(-1), check: parts.length > 3 }
}

const yearOf = (text) => str(text).match(/(19|20)\d{2}/g)?.at(-1) ?? ''

// The newest education entry, by the year it ended (Present counts as now).
function newestEducation(entries = []) {
  const when = (e) => (/present|current|now/i.test(str(e.endDate)) ? 9999 : Number(yearOf(e.endDate) || yearOf(e.startDate) || 0))
  return [...entries].sort((a, b) => when(b) - when(a))[0] ?? null
}

// "B.Tech, Computer Engineering" or "Bachelor of Technology in Computer
// Science": the degree, then the subject.
function splitDegree(title) {
  const text = str(title)
  const at = text.search(/,| in /i)
  if (at === -1) return { degree: text, discipline: '' }
  return { degree: text.slice(0, at).trim(), discipline: text.slice(at).replace(/^(,| in )/i, '').trim() }
}

export function profileValues(profile = {}) {
  const basics = profile?.basics ?? {}
  const name = splitName(basics.name)
  const place = str(basics.location).split(',').map((p) => p.trim()).filter(Boolean)
  const current = (profile?.experience ?? []).find((e) => /present|current|now/i.test(str(e.endDate))) ?? null
  const school = newestEducation(profile?.education)
  const { degree, discipline } = splitDegree(school?.title)
  const years = profile?.years === null || profile?.years === undefined ? '' : String(profile.years)
  return {
    fullName: str(basics.name),
    firstName: name.first,
    lastName: name.last,
    nameCheck: name.check,
    email: str(basics.email),
    phone: phoneForms(basics.phone),
    city: place[0] ?? '',
    country: place.length > 1 ? place.at(-1) : '',
    linkedin: asUrl(basics.links?.linkedin),
    github: asUrl(basics.links?.github),
    portfolio: asUrl(basics.links?.portfolio),
    company: str(current?.organisation),
    title: str(current?.title),
    years,
    school: str(school?.organisation),
    degree,
    discipline,
    gradYear: yearOf(school?.endDate),
  }
}
