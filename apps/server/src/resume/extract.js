import { callWithFallback } from '../ai/fallback.js'
import { parseJsonObject } from '../ai/loose-json.js'
import { ProviderError } from '../ai/errors.js'
import { INSTRUCTION } from './extract-prompt.js'
import { linkAppendix } from './link-appendix.js'

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
// The instruction, the resume and its links travel together as one prompt
// over stdin (see ai/spawn.js), so nothing user-supplied ever reaches a
// command line. `links` are the pairs read out of the PDF (see
// pdf-links.js); with none, the prompt is the instruction and the text alone.
//
// `run`, `locate` and `emit` pass straight through to callProvider: the first
// two so a test never spawns a real CLI, the third so a route can stream.
export async function extractProfile(resumeText, { links = [], select, ...seams } = {}) {
  const prompt = INSTRUCTION + resumeText + linkAppendix(links)
  const { provider, text } = await callWithFallback({ select, policy: TOOLS, prompt, timeoutMs: TIMEOUT_MS, ...seams })
  const parsed = parseJsonObject(text)
  if (!parsed) throw new ProviderError('unreadable', provider)
  return parsed
}
