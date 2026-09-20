import { buildCoverLetterPrompt } from './cover-letter-prompt.js'
import { buildRefineSection } from './refine-section.js'

// A refine keeps the same rules (only resume facts, the length, the cliches
// to avoid) and the same two fences, so a shorter letter or one that leads
// with a different project is still bound by what the resume actually shows.
export function buildCoverLetterRefinePrompt(posting, context, previous, instruction) {
  return buildCoverLetterPrompt(posting, context) + buildRefineSection(previous?.letter, instruction)
}
