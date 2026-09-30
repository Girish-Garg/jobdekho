import { ghostSignals, legitimacy } from '@jobdekho/core/ghost.js'
import { withGroupWindows } from './posting-groups.js'

// One posting by id, as an AI action needs it: the feed row plus the full
// description the feed withholds, since a check on a job has to read the
// whole job. Absent from the corpus is null, and that includes a posting the
// person still has open in the browser after a scrape dropped it.
//
// The ghost signals come from the same group windows the feed builds, so the
// "listed on N boards" signal here agrees with the card that led the person
// to ask. Windowing the whole corpus for one row is a scan per lookup, which
// is nothing next to the minutes of AI work that follow it. The feed windows
// only the rows its filters kept, so a count here can run a little higher.
export async function getPosting(store, userId, id) {
  const stored = store.corpus.byId().get(id)
  if (!stored) return null
  // What the fit read from the ad is the feed's working, not part of the job.
  const { features, ...row } = stored
  const windowed = withGroupWindows(store.corpus.rows()).find((r) => r.id === id) ?? row
  return {
    ...row,
    status: store.statuses.get(userId)?.[id] ?? null,
    groupCount: Number(windowed.groupCount ?? 1),
    legitimacy: legitimacy(windowed),
    ghostSignals: ghostSignals(windowed),
  }
}

// Just the title and company of each id the corpus still holds, for a list
// that names jobs rather than opening one: no windowing, one map lookup per
// id. An id a scrape has since dropped is simply absent from the answer.
export function postingNames(store, ids) {
  const byId = store.corpus.byId()
  const names = new Map()
  for (const id of ids) {
    const row = byId.get(id)
    if (row) names.set(id, { title: row.title, company: row.company })
  }
  return names
}
