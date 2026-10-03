import { ghostSignals, legitimacy } from '@jobdekho/core/ghost.js'
import { payLabel } from '@jobdekho/core/pay-label.js'
import { newness } from '@jobdekho/core/newness.js'
import { postingSections } from '@jobdekho/core/jd-layout.js'
import { postingFacts } from '@jobdekho/core/posting-facts.js'
import { withGroupWindows } from './posting-groups.js'
import { cautionFor } from './shared-ads.js'
import { templateOf } from './company-template.js'

// One posting by id, for the pane a person opens it in and for an AI action:
// the feed row plus the full description the feed withholds, and what the
// pane lays it out by:
//
//   sections   [{ kind, heading, lines, boilerplate }] or null (core's jd-layout.js)
//   facts      { years, pay, workMode }, each with its evidence (core's posting-facts.js)
//   caution    [{ code, reason, evidence }], the corpus-wide flags included
//
// and the tags with their evidence as stored (levelTag, typeTag,
// workModeTag, payTag). Absent from the corpus is null, and that includes a
// posting the person still has open in the browser after a scrape dropped it.
//
// The group count comes from the same windows the feed builds, so it agrees
// with the card that led the person here. Windowing the whole corpus for one
// row is a scan per lookup, nothing next to reading the posting.
export async function getPosting(store, userId, id) {
  const stored = store.corpus.byId().get(id)
  if (!stored) return null
  const rows = store.corpus.rows()
  // What the fit and the tags were read from is the feed's working, not part
  // of the job; each tag's evidence already says it.
  const { features, board, adKey, tagsVersion, ...row } = stored
  const windowed = withGroupWindows(rows).find((r) => r.id === id) ?? row
  const caution = cautionFor(stored, rows)
  return {
    ...row,
    status: store.statuses.get(userId)?.[id] ?? null,
    groupCount: Number(windowed.groupCount ?? 1),
    caution,
    legitimacy: legitimacy({ caution }),
    ghostSignals: ghostSignals({ caution }),
    payLabel: payLabel(row.stipend, row.currency ?? undefined),
    newness: newness(row),
    sections: postingSections(row.descriptionText, { company: row.company, isTemplate: templateOf(rows, row.company) }),
    facts: postingFacts(stored),
  }
}

// Each id the corpus still holds, named and marked closed or not (see
// corpus-closure.js), for a list that shows jobs as chips: one map lookup
// per id, no windowing.
export function postingCards(store, ids) {
  const byId = store.corpus.byId()
  const held = ids.filter((id) => byId.has(id)).map((id) => [id, byId.get(id)])
  return new Map(held.map(([id, row]) => [id, { title: row.title, company: row.company, closed: Boolean(row.closedAt) }]))
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
