// What JobDekho asks Adzuna for, in one place, so the scrape (adzuna.js) and
// Settings' "Check key" (the server's adzuna/check.js) call the very same
// endpoint. Kept apart from the adapter so the server can build the URL
// without loading the HTML parser the adapter brings.
//
// Adzuna's free key allows 25 requests a minute, 250 a day, 1,000 a week
// and 2,500 a month (developer.adzuna.com/docs/terms_of_service). A run asks
// for at most PAGES pages, one after another, and stops at the first short
// one; the runner's one retry after a failed first page makes the worst case
// PAGES + 1 = 4 requests. The daily refresh then spends about 120 a month,
// and even twenty refreshes every day stay under the monthly 2,500.
export const PAGES = 3
// Adzuna's largest page, so the three pages bring as much as they can.
export const PER_PAGE = 50
export const WHAT = 'software developer'
// The scrape drops anything posted over 60 days ago anyway (core's
// freshness.js), so asking for older ones would spend pages on nothing.
const MAX_DAYS_OLD = 60

// Newest first, so a daily run's pages bring the day's new postings rather
// than the same best matches as yesterday.
export function searchUrl({ country = 'in', page = 1, perPage = PER_PAGE, what = WHAT, appId, appKey }) {
  const enc = encodeURIComponent
  return `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}` +
    `?app_id=${enc(appId)}&app_key=${enc(appKey)}&results_per_page=${perPage}` +
    `&what=${enc(what)}&max_days_old=${MAX_DAYS_OLD}&sort_by=date&content-type=application/json`
}
