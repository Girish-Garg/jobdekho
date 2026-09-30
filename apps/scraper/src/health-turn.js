import { isPaused, nextRecord } from './source-guard.js'
import { shortDay } from './linkedin-note.js'

// What one scrape does about each source's health (see source-guard.js):
// before it, leave out the sources that are resting, listed among the run's
// results as skipped with why; after it, record how each source fared. Every
// scrape path goes through runScrape, so the CLI and the app's refresh obey
// one record. LinkedIn has its own guard and is left to it.
const OWN_GUARD = new Set(['linkedin'])

// A description this long is a real one. A source that sent at least five
// new postings is judged on the share of them that had one.
const WORDS = 150
const MIN_NEW = 5

const REASON = {
  failing: 'failed three runs in a row',
  refused: 'the site answered 429',
  gone: 'the board answered 404 twice; check its name in config/companies.json',
}

const note = (record) => `Paused until ${shortDay(record.pausedUntil)}: ${REASON[record.reason] ?? REASON.failing}`
const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

// The share of each source's new postings that came with a real description.
function bodyShares(fresh) {
  const by = new Map()
  for (const p of fresh) {
    const words = String(p?.descriptionText ?? '').split(/\s+/).filter(Boolean).length
    const tally = by.get(p.source) ?? { all: 0, real: 0 }
    by.set(p.source, { all: tally.all + 1, real: tally.real + (words >= WORDS ? 1 : 0) })
  }
  return new Map([...by].filter(([, t]) => t.all >= MIN_NEW).map(([source, t]) => [source, t.real / t.all]))
}

export function startHealthTurn({ db, adapters, now = Date.now }) {
  const stored = db.sourceHealth.get()
  const state = isRecord(stored) ? stored : {}
  const resting = adapters.filter((a) => !OWN_GUARD.has(a.name) && isPaused(state[a.name], now()))
  const skipped = resting.map((a) => ({ name: a.name, ok: true, count: 0, error: null, skipped: true, paused: true, note: note(state[a.name]) }))

  return {
    adapters: adapters.filter((a) => !resting.includes(a)),
    settle: (results) => [...results, ...skipped],
    // `listedBy(name)` counts the postings a source listed without sending
    // (skipped as known, or unchanged since its last read); `fresh` are the
    // run's new postings, as the pipeline stored them.
    record({ results, listedBy = () => 0, fresh = [] }) {
      const shares = bodyShares(fresh)
      const next = { ...state }
      for (const result of results) {
        if (result.skipped || OWN_GUARD.has(result.name)) continue
        const listed = (result.count ?? 0) + listedBy(result.name)
        next[result.name] = nextRecord(state[result.name], { result, listed, body: shares.get(result.name) ?? null }, now())
      }
      db.sourceHealth.set(next)
    },
  }
}
