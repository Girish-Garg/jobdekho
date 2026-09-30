// The jobs the person saved or applied to, for the Resume page's chat, so
// "tailor it for a job I saved" has jobs to choose from and "which ones
// still need a letter?" has an answer. Each is named, never described: a
// saved list can run to dozens, and their descriptions would crowd out the
// document the page is about. A job's own "Tailor my resume" reads the whole
// description when the person wants that.
//
// `tailored` and `letter` say what already exists for the job, from either
// place it can live: a saved AI answer for it (see packages/store/src/
// ai-results.js) or a document made for it on this page.
//
//   [{ id, title, company, status: 'saved' | 'applied', tailored, letter }]
const MAX_JOBS = 30
const STATUSES = ['saved', 'applied']

export async function savedJobs(dashboard, userId, documents = []) {
  const lists = await Promise.all(STATUSES.map((status) => dashboard.listPostingsForUser(
    userId, { status, includeStale: true, group: false, limit: MAX_JOBS },
  )))
  const rows = lists.flat().slice(0, MAX_JOBS)
  return Promise.all(rows.map(async (row) => {
    const kinds = new Set((await dashboard.listAiResults(userId, row.id)).map((r) => r.kind))
    const made = documents.filter((doc) => doc.postingId === row.id)
    return {
      id: row.id, title: row.title, company: row.company, status: row.status,
      tailored: kinds.has('resume-tailor') || made.some((doc) => doc.kind === 'resume'),
      letter: kinds.has('cover-letter') || made.some((doc) => doc.kind === 'cover-letter'),
    }
  }))
}
