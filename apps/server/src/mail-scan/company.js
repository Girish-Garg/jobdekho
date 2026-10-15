import { ATS, BOARDS, TESTS, senderOf } from './senders.js'

// Which company and which role a job mail is about. The company, most
// certain first: the subject's own words ("Thank you for applying to
// Globex"), a hiring system's link in the body (boards.greenhouse.io/globex),
// the sender's name with "Recruiting" and the like taken off, and last the
// sender's own domain (careers@globex.com). A role is kept only when it
// reads like one ("Backend intern", "SDE 1"); a wrong role costs more than
// a missing one.
const STOP = /(?:[!.,|:;()[\]]| - | at | for | regarding | about | on | via |$)/i
const FROM_SUBJECT = [
  new RegExp(`thank(?:s| you) for (?:applying|your (?:application|interest)|(?:your )?interest(?:ed)?) (?:to|at|with|in) (.+?)${STOP.source}`, 'i'),
  new RegExp(`your application (?:was sent |has been sent )?(?:to|at|with) (.+?)${STOP.source}`, 'i'),
  new RegExp(`interview (?:with|at) (.+?)${STOP.source}`, 'i'),
  /^(.+?) (?:has |have )?invited you to /i,
  new RegExp(`\\bat ([A-Z][\\w&.' ]{1,50}?)${STOP.source}`),
]
const SLUG = [
  /(?:job-)?boards\.greenhouse\.io\/(?:embed\/job_app\?for=)?([a-z0-9-]+)/i, /jobs\.lever\.co\/([a-z0-9-]+)/i, /([a-z0-9-]+)\.wd\d+\.myworkdayjobs\.com/i,
  /jobs\.ashbyhq\.com\/([a-z0-9-]+)/i, /([a-z0-9-]+)\.recruitee\.com/i, /apply\.workable\.com\/([a-z0-9-]+)/i, /([a-z0-9-]+)\.teamtailor\.com/i,
  /careers\.smartrecruiters\.com\/([a-z0-9-]+)/i, /([a-z0-9-]+)\.darwinbox\.in/i, /([a-z0-9-]+)\.keka\.com/i,
]
const SENDER_TAIL = /\s*(?:\bvia\b.*|\b(?:recruiting|recruitment|recruiters?|talent(?: acquisition)?|careers?|hiring|hr|people|human resources|jobs|notifications?|team|no.?reply)\b\W*)$/i
const SENDER_HEAD = /^(?:(?:the )?(?:talent(?: acquisition)?|recruiting|hiring|careers?|hr) (?:team )?(?:at|@)\s*)/i
const PLATFORMS = new Set([...ATS.values(), ...BOARDS.values(), ...TESTS.values()].map((name) => name.toLowerCase()))
const GENERIC = /^(us|our|our team|you|your|the|the team|the company|this|this role|the role|the position|a|an|team)$/i

const titled = (slug) => slug.split(/[-_]+/).filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(' ')

// A name, not a slogan: it starts with a capital or a digit ("build your
// interview-ready profile" does not), runs to five words at most, and says
// nothing a promotion says.
const SLOGAN = /\b(your|you|our|profile|skills?|learn|build|prep|course|interview|jobs?|career|opportunit\w*|free|today|now)\b/i

function clean(name) {
  const text = String(name ?? '').replace(/["'`]+$/g, '').replace(/\s+/g, ' ').trim()
  if (text.length < 2 || text.length > 60 || /@|https?:/.test(text) || GENERIC.test(text) || PLATFORMS.has(text.toLowerCase())) return ''
  if (!/^[\p{Lu}\d]/u.test(text) || text.split(' ').length > 5 || SLOGAN.test(text)) return ''
  return text
}

// A hiring system or a test platform sends under the company's name; mail
// from the company's own domain is usually from a person, whose name is no
// company, so its domain names it instead.
function fromSender(mail, sender) {
  if (sender.kind === 'company') return fromDomain(sender)
  if (sender.kind !== 'ats' && sender.kind !== 'test') return ''
  let name = String(mail.from.name ?? '').replace(SENDER_HEAD, '')
  for (let i = 0; i < 3; i += 1) name = name.replace(SENDER_TAIL, '')
  return clean(name)
}

function fromDomain(sender) {
  if (sender.kind !== 'company') return ''
  const parts = sender.domain.split('.')
  const label = parts.length > 2 && /^(mail|email|careers?|jobs|hr|talent|recruit\w*|e|m|notify|notifications)$/.test(parts[0]) ? parts[1] : parts.at(-2)
  return label ? titled(label) : ''
}

export function companyOf(mail, sender) {
  for (const pattern of FROM_SUBJECT) {
    // "Your application to Software Engineer at Globex" names the role
    // first; the "at" pattern after it finds the company.
    const found = clean(pattern.exec(mail.subject)?.[1])
    if (found && !ROLE_WORD.test(found)) return found
  }
  for (const pattern of SLUG) {
    const slug = pattern.exec(mail.text)?.[1]
    if (slug && !/^(www|jobs|careers|app|apply|boards?)$/i.test(slug)) return titled(slug)
  }
  // The person's own mail is about the company they wrote to.
  return mail.mine ? fromDomain(senderOf(mail.to[0])) : fromSender(mail, sender)
}

const ROLE_WORD = /\b(engineer|developer|intern|internship|analyst|scientist|designer|manager|sde|swe|associate|consultant|specialist|architect|tester|qa|devops|sre|trainee|programmer|administrator|lead|researcher)\b/i
const FROM_ROLE = [
  /\b(?:for|applying for|application for|applied for|interest in|interview for)(?: the| our| a| an)? (.+?)(?: position| role| opening| job| vacancy)?(?: at | with |[|,(:]| - |$)/i,
  /\b(?:position|role|job|opening):\s*(.+?)(?:[|,(]| - | at |$)/i,
  // "Interview invitation: Frontend Developer at Globex", "Offer letter: SDE 1"
  /:\s*(.+?)(?: at | with |[|,(]| - |$)/,
]

export function roleOf(mail) {
  for (const pattern of FROM_ROLE) {
    const found = String(pattern.exec(mail.subject)?.[1] ?? '').replace(/\s+/g, ' ').trim()
    if (found.length >= 3 && found.length <= 80 && ROLE_WORD.test(found)) return found
  }
  return ''
}
