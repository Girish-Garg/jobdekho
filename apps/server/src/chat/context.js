import { SORTS } from '@jobdekho/store/posting-order.js'
import { toListOpts } from './filter-opts.js'
import { compactPosting } from './postings-summary.js'
import { summarizeProfile } from './profile-summary.js'
import { postingsForNamedCompanies } from './question-search.js'
import { blockedCompanies } from './blocked-names.js'

// How many rows of the matching set the model actually sees - the same
// "first screenful" a person scans before scrolling, not the whole feed.
const TOP_N = 25

// The feed a general chat is asked from, built from the store alone.
// `filters` and `sort` are the only things trusted from the client: they say
// WHERE to look, and every row that comes back is re-read from the store
// here, never taken from the request body. This is what makes a chat answer
// trustworthy even from a browser tab someone tampered with - the worst it
// can do is ask about a different filter.
//
// The jobs a chat is about are not here: they come from the chat itself
// (see chat-items-context.js), never from what the pane has open.
// `question` is read for the companies it names, whose openings come from
// the whole corpus rather than the screen (see question-search.js).
//
// The companies the person blocked go by name, so an answer can say one is
// blocked rather than that it has none. Their postings are already gone from
// every list read here (see the store's dashboard.js).
export async function assembleChatContext(dashboard, userId, { filters, sort, question = '', now } = {}) {
  const knownSort = SORTS.includes(sort) ? sort : 'match'
  const profile = await dashboard.getProfile(userId)
  const blocked = await blockedCompanies(dashboard, userId)
  const matching = await dashboard.listPostingsForUser(userId, toListOpts(filters, knownSort, profile))
  return {
    postingCount: matching.length,
    sort: knownSort,
    top: matching.slice(0, TOP_N).map(compactPosting),
    profile: summarizeProfile(profile),
    named: await postingsForNamedCompanies(dashboard, userId, question, profile, now, blocked.keys),
    blocked: blocked.names,
  }
}

// What every chat on the feed is told that is not the feed: the career
// record's summary and the companies blocked.
export async function chatBasics(dashboard, userId) {
  const [profile, blocked] = await Promise.all([dashboard.getProfile(userId), blockedCompanies(dashboard, userId)])
  return { profile: summarizeProfile(profile), blocked: blocked.names }
}
