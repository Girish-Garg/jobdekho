// What one run asks LinkedIn's guest search for. Every choice here was
// measured against the live endpoint on 2026-09-30, one spaced request at a
// time; docs/adding-sources.md has the numbers.
//
// Each term names both a role family and a level, because the endpoint
// ignores the filters that would do the level for us: f_E=1 (internship) and
// f_E=2 (entry level) returned the same ten cards for "software", and f_E=1
// with no keyword returned a Helper and a Senior Executive. sortBy=DD changed
// nothing either. A bare "intern" is no shortcut: none of its first 20 cards
// were tech, the intern market there being mostly sales and marketing.
//
// Terms whose first page added fewer than five cards the others had not
// ("full stack developer intern" added 4, "junior software developer" 3)
// are left out; what they find, these find. The deepest pools go first,
// since the budget's last partial round of pages goes to the front.
export const TERMS = [
  'software engineer intern', 'fresher software engineer', 'associate software engineer',
  'data analyst intern', 'frontend developer intern', 'data science intern', 'devops intern',
  'machine learning intern', 'ai engineer intern', 'backend developer intern', 'web developer intern',
  'android developer intern', 'software testing intern', 'product manager intern',
]

// Past month, not past week. A week of "software engineer intern" runs thin
// by start=100 (5 of 10 cards relevant, 4 of them seen already) where a
// month still gave 9 of 10. JobDekho runs on a person's own computer, which
// can be off for days, and a week-wide window loses what was posted while it
// was. The feed also hides a posting not seen for 21 days, so re-reading
// postings up to a month old keeps them visible while they are still listed.
const PAST_MONTH = 'r2592000'
const PER_PAGE = 10

// 60 pages is 600 cards at most. 14 terms go 4 pages deep and the first four
// a fifth; a term that stops early hands its pages on, up to MAX_PAGES. The
// sampled pages gave 8.4 distinct cards each across terms, so about 500 per
// run. City searches were weighed and dropped: Bengaluru's first page added
// 4 cards the India-wide pages had not, as few as the terms left out above.
export const SEARCH_BUDGET = 60
export const MAX_PAGES = 6

// About 3 seconds each with the pause, so two minutes at most. The first run
// describes 40 of its ~500 cards; later runs skip what the store already
// has, so the cap goes to that day's new postings and then the backlog.
export const DESCRIBE_CAP = 40

export const searchUrl = (term, page) =>
  'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search' +
  `?keywords=${encodeURIComponent(term)}&location=India&f_TPR=${PAST_MONTH}&start=${page * PER_PAGE}`

// Page 0 of every term before page 1 of any. Relevance falls with depth (10
// of 10 on page 0, 5 of 10 at start=250), so whatever the budget leaves
// unread is the least relevant part of the sweep.
export function planQueries(terms = TERMS, maxPages = MAX_PAGES) {
  const plan = []
  for (let page = 0; page < maxPages; page++) for (const term of terms) plan.push({ term, page })
  return plan
}
