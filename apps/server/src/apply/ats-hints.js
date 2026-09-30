// Which applicant tracking system a page belongs to, and the field names it is
// known to use. Hints only speed things up: every field is also read by its
// words (field-classify.js), which is what covers a site nobody listed. The
// names come from each system's live pages (see the research survey).
export function atsOf(url) {
  let host = ''
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return 'generic'
  }
  if (/(^|\.)greenhouse\.io$/.test(host)) return 'greenhouse'
  if (/(^|\.)lever\.co$/.test(host)) return 'lever'
  if (/(^|\.)ashbyhq\.com$/.test(host)) return 'ashby'
  return 'generic'
}

const HINTS = {
  greenhouse: {
    first_name: 'firstName',
    last_name: 'lastName',
    email: 'email',
    phone: 'phone',
    // The country beside the phone number, a React-Select list of countries.
    country: 'country',
    'candidate-location': 'city',
    resume: 'resume',
    cover_letter: 'cover',
  },
  lever: {
    name: 'fullName',
    email: 'email',
    phone: 'phone',
    location: 'city',
    org: 'company',
    'urls[linkedin]': 'linkedin',
    'urls[github]': 'github',
    'urls[portfolio]': 'portfolio',
    resume: 'resume',
  },
  ashby: {
    _systemfield_name: 'fullName',
    _systemfield_email: 'email',
    _systemfield_location: 'city',
    _systemfield_resume: 'resume',
  },
}

// Plain-looking inputs that open a list of suggestions and only keep a value
// picked from it, so they are answered like a combobox.
const SUGGESTING = { lever: new Set(['location']) }

export function hintFor(ats, field) {
  const table = HINTS[ats]
  if (!table) return null
  return table[field.id] ?? table[String(field.name).toLowerCase()] ?? null
}

export const suggests = (ats, field) => SUGGESTING[ats]?.has(field.name) ?? false
