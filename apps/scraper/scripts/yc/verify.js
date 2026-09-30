import { buildAdapters } from '@jobdekho/sources/registry.js'
import { normalize } from '@jobdekho/core/normalize.js'
import { filter } from '@jobdekho/core/filter.js'

// A board found on a company's site proves nothing until its own API answers
// with postings, and it earns a place in the config only when core's
// relevance rules (config/filters.json) keep at least one of them: most YC
// companies' remote roles are locked to the US, and a board whose postings
// are all dropped would cost a request on every run for nothing.
//
// The adapter is the one the scrape uses, fed the maintainer's polite http.
// Being told every posting is already known keeps SmartRecruiters from
// reading a body per posting: the list is enough to judge.
const judge = { known: () => true, wanted: () => true }

export async function verifyBoard(entry, http, rules) {
  const [adapter] = buildAdapters({ providers: [entry] })
  if (!adapter) return { ok: false, why: `unknown provider ${entry.provider}` }
  try {
    const raws = await adapter.fetch(http, judge)
    const kept = raws.map((raw) => normalize(raw, adapter.name)).filter((p) => filter(p, rules))
    return {
      ok: kept.length > 0,
      name: adapter.name,
      total: raws.length,
      kept: kept.length,
      sample: kept.slice(0, 3).map((p) => `${p.title} (${p.location})`),
      ...(kept.length ? {} : { why: raws.length ? 'no posting passes the relevance rules' : 'the board lists nothing' }),
    }
  } catch (err) {
    return { ok: false, name: adapter.name, why: String(err?.message ?? err).slice(0, 160) }
  }
}
