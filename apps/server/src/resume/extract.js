import { callWithFallback } from '../ai/fallback.js'
import { parseJsonObject } from '../ai/loose-json.js'
import { ProviderError } from '../ai/errors.js'

// The instruction and the resume travel together as one prompt over stdin
// (see ai/spawn.js), so nothing user-supplied ever reaches a command line.
const INSTRUCTION = `Read the resume below and reply with ONE JSON object and nothing else.
No prose, no markdown fence. Shape:
{"skills":[],"titles":[],"locations":[],"years":<number>,"degree":"none|bachelors|masters|phd",
"experience":[{"title":"","organisation":"","location":"","startDate":"","endDate":"","bullets":[]}],
"projects":[{"title":"","organisation":"","startDate":"","endDate":"","bullets":[],"tech":[],"link":""}],
"education":[{"title":"","organisation":"","location":"","startDate":"","endDate":""}]}

skills: concrete technologies and tools only, lowercase, at most 25. No soft skills.
titles: job titles actually held or clearly targeted, lowercase.
locations: cities or regions the person is in or wants, lowercase.
years: total years of professional experience as a number. Internships count as
  0.5 each. Use 0 for a student or new graduate.
degree: the HIGHEST completed or in-progress degree. "none" if unclear.

experience: one entry per job or internship actually held, most recent first.
  title is the role held, organisation is the employer, dates and bullets are
  written as they appear in the resume. Omit the array entirely if the
  resume lists none.
projects: one entry per project, side project or piece of coursework named on
  its own. organisation is the employer or context it was built under, or ""
  for independent work. tech is the stack named for that project only.
education: one entry per degree or programme. title is the degree or
  programme name, organisation is the institution.

These three arrays are PROPOSALS: whatever you list is offered to the person
for review, never written over anything they already have, so include every
entry you can find rather than picking a "best" few.

RESUME:
`

// A resume is a few pages. Two minutes is generous for reading one and short
// enough that a hung CLI does not hold the browser forever.
const TIMEOUT_MS = 120000

const TOOLS = 'none'

export { parseJsonObject as parseProfileJson }

// No tools: reading a resume needs none, and the resume is the one document
// here that must never leave the machine. The policy is named here and the
// CLI chosen for it by `select` (see ai/select.js), so a CLI that cannot
// honour it is never handed the resume.
//
// `run`, `locate` and `emit` pass straight through to callProvider: the first
// two so a test never spawns a real CLI, the third so a route can stream.
export async function extractProfile(resumeText, { select, ...seams } = {}) {
  const { provider, text } = await callWithFallback({ select, policy: TOOLS, prompt: INSTRUCTION + resumeText, timeoutMs: TIMEOUT_MS, ...seams })
  const parsed = parseJsonObject(text)
  if (!parsed) throw new ProviderError('unreadable', provider)
  return parsed
}
