import { normalizeGuard, planSweep, recordSweep } from './linkedin-guard.js'
import { linkedinOn } from './linkedin-setting.js'
import { skipNote } from './linkedin-note.js'

const NAME = 'linkedin'
const iso = (ms) => new Date(ms).toISOString()

// What one scrape does about LinkedIn, decided before anything is fetched:
// leave it out (switched off in Settings), skip it (read less than 20 hours
// ago, or paused after a refusal), or sweep it at the size the guard chose
// (see linkedin-guard.js). Every scrape path goes through runScrape, so the
// CLI, "Refresh now" in Settings and the daily refresh all obey one guard.
// When the config does not list LinkedIn, none of this reads or writes.
//
// `adapters` is the list the run fetches, LinkedIn left out unless it runs;
// `context` carries the sweep's size to the adapter. settle(results) records
// how the sweep went, or adds a skipped LinkedIn to the results as a note.
export function startLinkedinTurn({ db, userId, adapters, now = Date.now }) {
  if (!adapters.some((a) => a.name === NAME)) return { adapters, context: {}, settle: (results) => results }
  const before = normalizeGuard(db.linkedinGuard.get())
  const plan = linkedinOn(db, userId) ? planSweep(before, now()) : { run: false, why: 'off' }

  if (!plan.run) {
    const skipped = plan.why === 'off' ? null : { name: NAME, ok: true, count: 0, error: null, skipped: true, note: skipNote(plan, now()) }
    return {
      adapters: adapters.filter((a) => a.name !== NAME),
      context: {},
      settle: (results) => (skipped ? [...results, skipped] : results),
    }
  }

  // Claimed as read before the first request, so a second scrape started
  // meanwhile (`npm run scrape` beside the app's own) skips it rather than
  // sweeping alongside. settle() puts the claim right once the sweep is over.
  db.linkedinGuard.set({ ...before, lastSweepAt: iso(now()) })
  const adapter = adapters.find((a) => a.name === NAME)
  return {
    adapters,
    context: { linkedin: plan.sweep },
    settle(results) {
      db.linkedinGuard.set(recordSweep(before, adapter.outcome ?? {}, now()))
      return results
    },
  }
}
