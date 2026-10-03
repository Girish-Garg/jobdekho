import { buildResumeTailorPrompt, MAX_DESCRIPTION } from './resume-tailor-prompt.js'

// "Tailor resume for all" in a comparison (see chat/tailor-all.js): the
// tailoring prompt reads one posting, so the compared jobs are handed to it
// as one, each under its own title and company, and the prompt then says
// they are several. The plan is checked exactly as a single job's is (see
// resume-tailor-parse.js), its coverage counted against all of them.
//
// Each job gets an equal share of the one description limit, so the last
// job compared is not the one cut away.
const SEPARATOR = 100

export function sharedPosting(postings) {
  const share = Math.max(0, Math.floor(MAX_DESCRIPTION / Math.max(1, postings.length)) - SEPARATOR)
  const description = (p) => String(p.descriptionText || p.descriptionSnippet || '').slice(0, share)
  return {
    id: postings.map((p) => p.id).join('+'),
    title: postings.map((p) => p.title).join(' / '),
    company: postings.map((p) => p.company).join(' + '),
    descriptionText: postings.map((p) => `${p.title} at ${p.company}:\n${description(p)}`).join('\n\n'),
    tags: [...new Set(postings.flatMap((p) => p.tags ?? []))],
  }
}

const shared = (count) => `\nThe POSTING above is not one job but ${count} jobs the person is applying to at once, one after another, each under its own title and company. Plan ONE resume for all of them: lead with what most of them ask for, and do not chase a requirement only one of them names. Every rule above still holds.\n`

export function buildSharedTailorPrompt(postings, profile, memory = []) {
  return `${buildResumeTailorPrompt(sharedPosting(postings), profile, memory)}${shared(postings.length)}`
}
