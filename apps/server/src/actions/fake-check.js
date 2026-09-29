import { buildFakeCheckPrompt } from './fake-check-prompt.js'
import { buildFakeCheckRefinePrompt } from './fake-check-refine-prompt.js'
import { parseFakeCheck } from './fake-check-parse.js'

// "Is this job real?": the CLI goes and looks the company and the role up on
// the web. The only action with tools, so the only one that gets web search
// and no personal data at all (context is empty, and the prompt reads fixed
// posting fields). It searches, so it gets the long timeout: a company site,
// the posting URL and a few searches take a couple of minutes on a good day.
export const fakeCheck = {
  kind: 'fake-check',
  tools: 'web',
  timeoutMs: 5 * 60 * 1000,
  context: [],
  buildPrompt: (posting) => buildFakeCheckPrompt(posting),
  buildRefinePrompt: (posting, context, previous, instruction) => buildFakeCheckRefinePrompt(posting, previous, instruction),
  parse: parseFakeCheck,
}
