import { topicsOf, isSensitive } from './topics.js'

// Which saved memories go with one AI call: those that bear on it, read
// from their words (topics.js), rather than every one there is. Memory
// layers that work at scale do the same, retrieving what is relevant per
// request; here it is a few hundred string checks, on this computer.
const shares = (a, b) => [...a].some((name) => b.has(name))

// "Is this job real?" is the one call that searches the web, so it gets
// only what is about checking a job: how to check it, its pay, its company,
// its interviews. Nothing sensitive, and nothing kept for resumes or
// letters, ever goes with it.
const CHECKING = new Set(['check', 'pay', 'company', 'interview'])

export function memoriesForCheck(items = []) {
  return items.filter((item) => item.scope !== 'resume' && item.scope !== 'letters'
    && !isSensitive(item.text) && shares(topicsOf(item.text), CHECKING))
}

// The places a page's chat works on: the feed is about jobs, the Profile
// page about the career record a resume is made from, the Resume page about
// resumes and letters, Settings about none of them.
const PAGE_SCOPES = new Map([
  ['postings', ['jobs']], ['profile', ['resume', 'jobs']], ['resume', ['resume', 'letters']], ['settings', []],
])

// A chat question gets the memories kept for everywhere and for its page,
// and any other whose topics the question touches: a letter preference
// comes along when the question on the feed asks for a letter.
export function memoriesForChat(items = [], { page = 'postings', message = '' } = {}) {
  const scopes = new Set(['everywhere', ...(PAGE_SCOPES.get(page) ?? ['jobs'])])
  const asked = topicsOf(message)
  return items.filter((item) => scopes.has(item.scope) || shares(topicsOf(item.text), asked))
}
