import { parseJob } from './successfactors-job.js'
import { isThrottled } from './successfactors-get.js'

// Each chosen posting's own page, one at a time through the board's paced
// getter: the list gives a title and one place, the page the body, every
// place and the date. A page that fails or holds no posting is left out and
// the rest carry on; once the host answers 429 nothing more is sent to it
// this run.
export async function readJobs(get, site, rows) {
  const jobs = new Map()
  for (const row of rows) {
    try {
      const job = parseJob(await get(site.jobUrl(row.href)))
      if (job) jobs.set(row.id, job)
    } catch (err) {
      if (isThrottled(err)) return { jobs, throttled: true }
    }
  }
  return { jobs, throttled: false }
}
