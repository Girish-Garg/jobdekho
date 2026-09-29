import { SORTS } from '@jobdekho/store/posting-order.js'
import { toListOpts } from './filter-opts.js'
import { compactPosting, trimOpenPosting } from './postings-summary.js'
import { summarizeProfile } from './profile-summary.js'
import { summarizeResults } from './results-summary.js'
import { postingsForNamedCompanies } from './question-search.js'

// How many rows of the matching set the model actually sees - the same
// "first screenful" a person scans before scrolling, not the whole feed.
const TOP_N = 25

// Everything the chat prompt is allowed to know about what is on screen,
// built from the store alone. `filters`, `sort` and `openPostingId` are the
// only things trusted from the client: they say WHERE to look, and every row
// that comes back is re-read from the store here, never taken from the
// request body. This is what makes a chat answer trustworthy even from a
// browser tab someone tampered with - the worst it can do is ask about a
// different filter or a posting id that is not theirs, and getPosting scopes
// that to the signed-in user like every other route already does.
//
// `openPostingId` is the posting the chat is scoped to, which is usually the
// one open in the pane; its saved AI answers ride along (results-summary.js).
// `question` is read for the companies it names, whose openings come from
// the whole corpus rather than the screen (see question-search.js).
export async function assembleChatContext(dashboard, userId, { filters, sort, openPostingId, question = '', now } = {}) {
  const knownSort = SORTS.includes(sort) ? sort : 'match'
  const profile = await dashboard.getProfile(userId)
  const matching = await dashboard.listPostingsForUser(userId, toListOpts(filters, knownSort, profile))
  const open = openPostingId ? await dashboard.getPosting(userId, openPostingId) : null
  const saved = open ? await dashboard.listAiResults(userId, open.id) : []
  return {
    postingCount: matching.length,
    sort: knownSort,
    top: matching.slice(0, TOP_N).map(compactPosting),
    open: trimOpenPosting(open),
    openResults: summarizeResults(saved),
    profile: summarizeProfile(profile),
    named: await postingsForNamedCompanies(dashboard, userId, question, profile, now),
  }
}
