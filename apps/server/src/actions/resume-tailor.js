import { buildResumeTailorPrompt } from './resume-tailor-prompt.js'
import { buildResumeTailorRefinePrompt } from './resume-tailor-refine-prompt.js'
import { parseResumeTailor } from './resume-tailor-parse.js'

// "Tailor my resume for this job": the CLI picks which of the person's own
// career-record entries fit this posting, orders them, and rewords the
// bullets it keeps; the server then checks every reworded bullet against the
// one entry it claims to reword (see resume-tailor-validate.js) so nothing
// invented reaches the person unflagged, and drops any entry id the profile
// does not actually have.
//
// No tools, without exception: the prompt holds the whole career record, and
// the posting in it is scraped text that could tell an agent with a browser
// or a shell to send that record somewhere. Three minutes because picking
// and rewording a multi-year record is a long reply, not because anything is
// looked up.
export const resumeTailor = {
  kind: 'resume-tailor',
  tools: 'none',
  timeoutMs: 3 * 60 * 1000,
  context: ['profileEntries'],
  memoryScope: 'resume',
  buildPrompt: (posting, context) => buildResumeTailorPrompt(posting, context.profileEntries, context.memory),
  buildRefinePrompt: (posting, context, previous, instruction) =>
    buildResumeTailorRefinePrompt(posting, context.profileEntries, previous, instruction, context.memory),
  parse: (raw, { posting, context }) => parseResumeTailor(raw, { posting, context: { profile: context.profileEntries } }),
}
