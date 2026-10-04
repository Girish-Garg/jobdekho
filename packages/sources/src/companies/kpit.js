import { toIso } from '../iso-date.js'
import { politeAdapter, pauseFor } from './portal-polite.js'
import { describeNew } from './portal-describe.js'
import { sections } from './portal-text.js'
import { LIST_URL, parseListing } from './kpit-list.js'

// KPIT lists its jobs on its own site (kpit-list.js) and keeps them in
// TalentOjo, whose public job record is what each posting's apply page
// reads: talentojo.kpit.com/service/jobs/{id}, with no login or token, on a
// host with no robots.txt. The list carries no body and no date, so a
// job's record is read for each new posting the filter would keep, at most
// 40 a run (portal-describe.js), one a second. The record also names its
// recruiters; nothing of theirs is kept.
const NAME = 'kpit'
const JOB_API = 'https://talentojo.kpit.com/service/jobs/'
const jobPage = (id) => `https://talentojo.kpit.com/tojo/app/job-apply/#/Career%20Portal/${id}`
const asHtml = { headers: { Accept: 'text/html' } }

const where = (cities) => cities.map((city) => `${city}, India`).join(' / ') || 'India'

// Most of the jobs listed were opened months ago, past the run's age cut, so
// they are never stored and would be read again on every run. The date each
// record gave is remembered (the run's source memo) and handed to the
// filter with the row, which then turns such a job down before its record
// is asked for.
const DATES = 'created'
const datesOf = (context) => context?.recall?.(NAME, DATES) || {}

const listed = (row) => ({ externalId: row.id, title: row.title, company: 'KPIT', location: where(row.places) })
const listedWith = (dates) => (row) => ({ ...listed(row), postedAt: dates[row.id] || null })

// A record no longer Published, or for a job outside India, is left out.
async function readJob(http, row) {
  const job = (await (await http(`${JOB_API}${row.id}`)).json())?.job
  return job && job.status === 'Published' && (!job.country || job.country === 'India') ? job : null
}

// "Mechanical,Product / Domain Knowledge" reads better spaced.
const spaced = (value) => (Array.isArray(value) ? value : String(value || '').split(','))
  .map((part) => String(part).trim()).filter(Boolean).join(', ')

function body(job) {
  const degree = [spaced(job.qualification), spaced(job.qualification_specialization)].filter(Boolean).join(' in ')
  return sections([['', job.description], ['Skills', spaced(job.required_skills)],
    ['Additional skills', spaced(job.additional_skills)], ['Qualification', degree]])
}

const years = (job, row) => (Number.isFinite(job.min_experience)
  ? `${job.min_experience} - ${job.max_experience ?? job.min_experience} years` : row.experience || null)

// created_at is the day alone, "2026/06/11", read as UTC. The tags are the
// record's role family ("Engineer"); its employment type is cut short at
// 20 characters ("Full Time With Benef").
const toPosting = (row, job) => ({
  ...listed(row),
  location: where(Array.isArray(job.location) && job.location.length ? job.location : row.places),
  url: jobPage(row.id),
  description: body(job),
  tags: (Array.isArray(job.job_role) ? job.job_role : []).filter((role) => typeof role === 'string' && role.trim()),
  postedAt: toIso(String(job.created_at || '').replace(/\//g, '-')),
  experience: years(job, row),
})

export function kpit({ pause = pauseFor(1000) } = {}) {
  return politeAdapter(NAME, async (http, context, adapter) => {
    const rows = parseListing(await (await http(LIST_URL, asHtml)).text())
    const dates = datesOf(context)
    const out = await describeNew({ rows, throttled: false }, {
      name: NAME, adapter, context, pause, idOf: (row) => row?.id || '', asListed: listedWith(dates),
      read: (row) => readJob(http, row), toPosting,
    })
    const kept = Object.fromEntries(rows.filter((row) => dates[row.id]).map((row) => [row.id, dates[row.id]]))
    for (const posting of out) if (posting.postedAt) kept[posting.externalId] = posting.postedAt
    context?.keep?.(NAME, DATES, kept)
    return out
  })
}
