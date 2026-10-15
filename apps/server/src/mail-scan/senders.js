// Who sends job mail, by the domain in the From address. The hiring systems
// (ATS) send the "application received", "unfortunately" and test-link
// mails for the companies that use them, so their mail is read for those
// companies; the boards confirm an application sent through them. `label`
// is how a Tracker line names where it came from ("Greenhouse mail").
//
// A domain matches itself and its subdomains: greenhouse-mail.io covers
// us.greenhouse-mail.io.
export const ATS = new Map([
  ['greenhouse.io', 'Greenhouse'], ['greenhouse-mail.io', 'Greenhouse'], ['lever.co', 'Lever'], ['hire.lever.co', 'Lever'],
  ['myworkday.com', 'Workday'], ['myworkdayjobs.com', 'Workday'], ['workday.com', 'Workday'], ['smartrecruiters.com', 'SmartRecruiters'],
  ['ashbyhq.com', 'Ashby'], ['icims.com', 'iCIMS'], ['successfactors.com', 'SuccessFactors'], ['successfactors.eu', 'SuccessFactors'],
  ['taleo.net', 'Taleo'], ['oraclecloud.com', 'Oracle'], ['eightfold.ai', 'Eightfold'], ['phenompeople.com', 'Phenom'],
  ['jobvite.com', 'Jobvite'], ['recruitee.com', 'Recruitee'], ['teamtailor.com', 'Teamtailor'], ['zohorecruit.com', 'Zoho Recruit'],
  ['zohorecruit.in', 'Zoho Recruit'], ['freshteam.com', 'Freshteam'], ['darwinbox.in', 'Darwinbox'], ['darwinbox.com', 'Darwinbox'],
  ['keka.com', 'Keka'], ['ripplehire.com', 'RippleHire'], ['turbohire.co', 'TurboHire'], ['zwayam.com', 'Zwayam'],
  ['superset.com', 'Superset'], ['joinsuperset.com', 'Superset'], ['avature.net', 'Avature'], ['breezy.hr', 'Breezy'],
  ['workable.com', 'Workable'], ['workablemail.com', 'Workable'], ['bamboohr.com', 'BambooHR'], ['rippling.com', 'Rippling'],
])

export const BOARDS = new Map([
  ['naukri.com', 'Naukri'], ['internshala.com', 'Internshala'], ['linkedin.com', 'LinkedIn'], ['wellfound.com', 'Wellfound'],
  ['angel.co', 'Wellfound'], ['instahyre.com', 'Instahyre'], ['cutshort.io', 'Cutshort'], ['hirist.tech', 'Hirist'],
  ['hirist.com', 'Hirist'], ['iimjobs.com', 'iimjobs'], ['foundit.in', 'foundit'], ['indeed.com', 'Indeed'],
  ['unstop.com', 'Unstop'], ['dare2compete.com', 'Unstop'], ['glassdoor.com', 'Glassdoor'], ['apna.co', 'apna'],
])

export const TESTS = new Map([
  ['hackerrank.com', 'HackerRank'], ['hackerearth.com', 'HackerEarth'], ['codility.com', 'Codility'], ['mettl.com', 'Mercer Mettl'],
  ['codesignal.com', 'CodeSignal'], ['testgorilla.com', 'TestGorilla'], ['imocha.io', 'iMocha'], ['hirepro.in', 'HirePro'],
  ['talview.com', 'Talview'], ['coderbyte.com', 'Coderbyte'],
])

// Senders whose mail is never an application: course and prep sites,
// communities and newsletters, and the marketing arms of boards (Unstop's
// news and events). "Interview" and "offer" fill their subjects ("Crack
// interviews, land offers"), which is why they are named here rather than
// left to the words.
export const MARKETING = new Set([
  'unstop.news', 'unstop.events', 'quora.com', 'quoramail.com', 'educative.io', 'datacamp.com', 'coursera.org', 'udemy.com',
  'udacity.com', 'edx.org', 'medium.com', 'substack.com', 'beehiiv.com', 'geeksforgeeks.org', 'leetcode.com', 'scaler.com',
  'simplilearn.com', 'upgrad.com', 'unacademy.com', 'codingninjas.com', 'interviewbit.com', 'topmate.io', 'skillshare.com',
  'pluralsight.com', 'kaggle.com', 'devpost.com', 'mlh.io', 'newsletter.linkedin.com', 'e.linkedin.com', 'naukri360.com',
  'shine.com', 'timesjobs.com', 'freecodecamp.org', 'hashnode.com', 'dev.to', 'producthunt.com', 'meetup.com', 'eventbrite.com',
])

const MARKETING_BY_DOMAIN = new Map([...MARKETING].map((domain) => [domain, true]))

// Mail services that carry a person's own address, never a company's.
export const PERSONAL = new Set(['gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'yahoo.com', 'yahoo.co.in', 'icloud.com', 'me.com', 'proton.me', 'protonmail.com', 'rediffmail.com', 'zoho.com', 'aol.com'])

function find(table, domain) {
  for (let d = domain; d.includes('.'); d = d.slice(d.indexOf('.') + 1)) if (table.has(d)) return table.get(d)
  return null
}

export const domainOf = (address) => String(address ?? '').toLowerCase().split('@')[1] ?? ''

// { kind: 'ats' | 'board' | 'test' | 'marketing' | 'personal' | 'company', label }
// for a From address.
export function senderOf(address) {
  const domain = domainOf(address)
  const ats = find(ATS, domain)
  if (ats) return { kind: 'ats', label: ats, domain }
  const board = find(BOARDS, domain)
  if (board) return { kind: 'board', label: board, domain }
  const test = find(TESTS, domain)
  if (test) return { kind: 'test', label: test, domain }
  if (find(MARKETING_BY_DOMAIN, domain)) return { kind: 'marketing', label: null, domain }
  if (PERSONAL.has(domain)) return { kind: 'personal', label: null, domain }
  return { kind: 'company', label: null, domain }
}

// An address no person reads: the replies a person writes come from people.
export const isNoReply = (address) => /(^|[._-])(no-?reply|do-?not-?reply|notifications?|mailer|alerts?|jobalerts?|updates?|news(letter)?)([._-]|@)/i.test(String(address ?? ''))
