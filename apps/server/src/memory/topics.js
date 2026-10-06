// What a saved memory, a question or a request is about, read locally from
// its words: no model, no call. The picker gives each AI call only the
// memories whose topics bear on it (picker.js), and the habit spotter counts
// the topics a person keeps asking about (habits.js). Maps and Sets, never
// plain objects: every word here comes from the person.
//
// Words match whole; phrases match as written, inside word boundaries. A
// topic lists its plurals rather than guessing at stems, so "salaries" is
// pay and "realtime" is not a check. Bare "real" is left out of checks on
// purpose: "real-time systems" is not a question about a fake job.
const topic = (words, phrases = []) => ({ words: new Set(words.split(/\s+/)), phrases })

export const TOPICS = new Map([
  ['pay', topic('salary salaries pay paid unpaid paying stipend stipends ctc lpa package packages compensation earn earning earnings wage wages payout money paisa kitna',
    ['in hand', 'per month', 'per annum'])],
  ['check', topic('fake scam scams scammer scammers fraud fraudulent legit legitimate genuine authentic spam trustworthy',
    ['is it real', 'is this real', 'job is real', 'job real', 'real or fake', 'red flag', 'red flags', 'ghost job', 'ghost jobs'])],
  ['place', topic('remote wfh hybrid onsite relocate relocation location locations city cities bangalore bengaluru pune hyderabad delhi ncr gurgaon gurugram noida mumbai chennai kolkata ahmedabad jaipur kochi indore chandigarh',
    ['work from home', 'work from office', 'on site', 'in office'])],
  ['company', topic('company companies startup startups mnc mncs funding funded reviews glassdoor ambitionbox culture layoffs employer employers',
    ['product company', 'service company', 'product based', 'service based', 'team size'])],
  ['interview', topic('interview interviews oa',
    ['online assessment', 'coding round', 'hr round', 'selection process', 'hiring process', 'interview process', 'interview rounds'])],
  ['experience', topic('fresher freshers experience experienced yoe junior senior intern interns internship internships graduate graduates',
    ['entry level', 'full time', 'new grad', 'years of experience'])],
  ['resume', topic('resume resumes cv cvs ats', ['one page', 'one-page'])],
  ['letter', topic('letter letters', ['cover letter', 'cover letters'])],
  ['style', topic('short shorter brief concise detailed table tables hindi hinglish english tone formal casual emoji emojis',
    ['bullet points', 'in points', 'step by step'])],
])

// Topics a memory or a habit offer is never made from, and that the
// web-searching check never receives, unless the person spells it out.
export const SENSITIVE = topic('visa visas h1b immigration citizenship health illness disability disabled pregnant pregnancy religion religious caste politics political sexuality lgbt lgbtq married divorced',
  ['h-1b', 'work permit', 'mental health'])

const flat = (text) => ` ${String(text ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `

const hit = ({ words, phrases }, padded, tokens) => tokens.some((token) => words.has(token))
  || phrases.some((phrase) => padded.includes(` ${phrase.replace(/[^\p{L}\p{N}]+/gu, ' ')} `))

// The topics `text` touches, as a Set of names from TOPICS.
export function topicsOf(text) {
  const padded = flat(text)
  const tokens = padded.trim().split(' ')
  return new Set([...TOPICS].filter(([, words]) => hit(words, padded, tokens)).map(([name]) => name))
}

export function isSensitive(text) {
  const padded = flat(text)
  return hit(SENSITIVE, padded, padded.trim().split(' '))
}
