import { callProvider } from '../ai/call.js'
import { parseJsonObject } from '../ai/loose-json.js'
import { ProviderError } from '../ai/errors.js'
import { DEFAULT_PROVIDER } from '../ai/providers.js'

// The instruction and the resume travel together as one prompt over stdin
// (see ai/spawn.js), so nothing user-supplied ever reaches a command line.
const INSTRUCTION = `Read the resume below and reply with ONE JSON object and nothing else.
No prose, no markdown fence. Shape:
{"skills":[],"titles":[],"locations":[],"years":<number>,"degree":"none|bachelors|masters|phd"}

skills: concrete technologies and tools only, lowercase, at most 25. No soft skills.
titles: job titles actually held or clearly targeted, lowercase.
locations: cities or regions the person is in or wants, lowercase.
years: total years of professional experience as a number. Internships count as
  0.5 each. Use 0 for a student or new graduate.
degree: the HIGHEST completed or in-progress degree. "none" if unclear.

RESUME:
`

// A resume is a few pages. Two minutes is generous for reading one and short
// enough that a hung CLI does not hold the browser forever.
const TIMEOUT_MS = 120000

export { parseJsonObject as parseProfileJson }

// `run`, `locate` and `emit` pass straight through to callProvider: the first
// two so a test never spawns a real CLI, the third so a route can stream.
//
// No tools: reading a resume needs none, and the resume is the one document
// here that must never leave the machine.
export async function extractProfile(resumeText, { provider = DEFAULT_PROVIDER, ...seams } = {}) {
  const { text } = await callProvider({ provider, prompt: INSTRUCTION + resumeText, tools: 'none', timeoutMs: TIMEOUT_MS, ...seams })
  const parsed = parseJsonObject(text)
  if (!parsed) throw new ProviderError('unreadable', provider)
  return parsed
}
