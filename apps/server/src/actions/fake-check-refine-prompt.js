import { buildFakeCheckPrompt } from './fake-check-prompt.js'
import { buildRefineSection } from './refine-section.js'

// A refine keeps the whole check: the untrusted-posting fence, the web tool
// instructions and the reply shape are exactly what the first run had, since
// the person's instruction can call for more browsing ("check whether the
// recruiter email domain matches the company"), not only a reworded summary
// of what was already found.
export function buildFakeCheckRefinePrompt(posting, previous, instruction) {
  return buildFakeCheckPrompt(posting) + buildRefineSection(JSON.stringify(previous), instruction)
}
