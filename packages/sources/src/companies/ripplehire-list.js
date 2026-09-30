import { readPages } from './portal-polite.js'

// A RippleHire career site's own search (its entities/job.js calls it
// candidatejobsearch): a form POST whose careerSiteUrlParams is the JSON the
// job list controller builds, "*:*" meaning every job. page counts from 0.
// Newest first. The site asks for 10 at a time; 50 works and costs a fifth
// of the requests, so two pages are the 100 newest.
export const PAGE_SIZE = 50
const MAX_PAGES = 2

const FORM = {
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  'X-Requested-With': 'XMLHttpRequest',
}

// A token the site no longer knows could come back as an empty list, which
// would look like a quiet board; a status other than "success" is thrown so
// the run shows the source as broken.
async function searchPage(http, site, page) {
  const params = { page, search: '*:*', token: site.token, source: 'CAREERSITE', pagesize: PAGE_SIZE }
  if (site.geo) params.geo = site.geo
  const body = new URLSearchParams({ careerSiteUrlParams: JSON.stringify(params), lang: 'en' }).toString()
  const res = await http(`https://${site.host}/candidate/candidatejobsearch`, { method: 'POST', headers: FORM, body })
  const data = await res.json()
  if (data?.errorStatus && data.errorStatus !== 'success') {
    throw new Error(`${site.name} search answered "${data.errorStatus}"`)
  }
  return Array.isArray(data?.jobVoList) ? data.jobVoList : []
}

export function listJobs(http, site, pause) {
  return readPages((page) => searchPage(http, site, page), { maxPages: MAX_PAGES, pageSize: PAGE_SIZE, pause })
}
