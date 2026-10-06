import { buildFakeCheckPrompt } from './fake-check-prompt.js'
import { buildFakeCheckRefinePrompt } from './fake-check-refine-prompt.js'
import { parseFakeCheck } from './fake-check-parse.js'

// "Is this job real?": the CLI goes and looks the company and the role up on
// the web. The only action with tools, so the only one that gets web search,
// and the one that gets nothing personal: no resume, no profile, only the
// posting's public fields and the person's saved preferences about checking
// jobs (memoryScope 'check', see memory/picker.js), such as "also check the
// pay". It searches, so it gets the long timeout: a company site, the
// posting URL and a few searches take a couple of minutes on a good day.
export const fakeCheck = {
  kind: 'fake-check',
  tools: 'web',
  timeoutMs: 5 * 60 * 1000,
  context: [],
  memoryScope: 'check',
  buildPrompt: (posting, context = {}) => buildFakeCheckPrompt(posting, context.memory),
  buildRefinePrompt: (posting, context = {}, previous, instruction) => buildFakeCheckRefinePrompt(posting, previous, instruction, context.memory),
  parse: parseFakeCheck,
}
