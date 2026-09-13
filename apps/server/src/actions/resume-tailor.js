import { buildResumeTailorPrompt } from './resume-tailor-prompt.js'
import { parseResumeTailor } from './resume-tailor-parse.js'

// "Tailor my resume for this job": the CLI rewrites the resume on file so an
// ATS scores it higher for this posting, and the server then checks the
// rewrite against the original in code (see resume-fact-check.js) so nothing
// invented reaches the person unflagged.
//
// No tools, without exception: the prompt holds the resume, and the posting
// in it is scraped text that could tell an agent with a browser or a shell
// to send that resume somewhere. Three minutes because a full rewrite of a
// two-page resume is a long reply, not because anything is looked up.
export const resumeTailor = {
  kind: 'resume-tailor',
  tools: 'none',
  timeoutMs: 3 * 60 * 1000,
  context: ['resumeText'],
  buildPrompt: (posting, context) => buildResumeTailorPrompt(posting, context.resumeText),
  parse: parseResumeTailor,
}
