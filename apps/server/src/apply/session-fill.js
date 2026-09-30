import { planFill } from './fill-plan.js'
import { runFill } from './fill-run.js'
import { checklistRows } from './checklist.js'
import { moveTo, canFill } from './session-state.js'
import { pushView } from './session-view.js'
import { scanPage } from './session-scan.js'
import { sleep } from './cdp-call.js'

// Where the wheel goes after a read: a wall to the person, a closed or sent
// application to its end, a page with the site's submit button to the final
// review, and anything else (a wizard page with only a Next) to the person to
// check and move on themselves.
export function settle(s, signals = {}) {
  if (s.closing) return
  if (signals.wall) moveTo(s, 'yours', signals.wall)
  else if (signals.closed) moveTo(s, 'yours', 'closed')
  else if (signals.submitted) moveTo(s, 'review', 'submitted')
  else if (signals.submit) moveTo(s, 'review', 'review')
  else moveTo(s, 'yours', 'check-page')
  pushView(s)
}

const contextOf = (s) => ({ cdp: s.active.cdp, world: s.world, ats: s.ats, canAct: () => canFill(s) })

// Fills the page in front of the person, once, as a press of theirs (opening
// Apply assist is the first press; "Fill this page" is every later one).
export async function fillPage(s) {
  if (s.closing || s.state === 'filling') return
  const signals = await scanPage(s)
  if (signals.wall || signals.closed || signals.submitted) return settle(s, signals)
  moveTo(s, 'filling')
  pushView(s)
  s.fileInfo = await s.files
  const steps = planFill({ fields: s.scan.fields, verdicts: s.verdicts, values: s.values, files: s.fileInfo ?? {}, done: s.results, ats: s.ats })
  await runFill(contextOf(s), steps, (fid, result) => {
    s.results.set(fid, result)
    s.rows = checklistRows({ fields: s.scan.fields, verdicts: s.verdicts, results: s.results })
    pushView(s)
  })
  // Let the page finish reacting to the last value before it is read again.
  await sleep(400)
  const after = await scanPage(s).catch(() => ({}))
  // The person pressed something mid-way and has the wheel already.
  if (s.state !== 'filling') return pushView(s)
  settle(s, after)
}
