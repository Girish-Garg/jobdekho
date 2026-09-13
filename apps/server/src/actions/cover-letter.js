import { buildCoverLetterPrompt } from './cover-letter-prompt.js'
import { parseCoverLetter } from './cover-letter-parse.js'

// "Write a cover letter": the prompt carries the resume, so this is the
// opposite case for tools from the fake check rather than a variant of it.
// No browser, no filesystem, nothing the reply could be smuggled through;
// the model only reads the prompt and answers, which is also the faster call.
export const coverLetter = {
  kind: 'cover-letter',
  tools: 'none',
  timeoutMs: 120000,
  context: ['resumeText'],
  buildPrompt: (posting, context) => buildCoverLetterPrompt(posting, context),
  parse: parseCoverLetter,
}
