import { READ_PAGE } from './page/read.js'
import { classify } from './field-classify.js'
import { withQuestions } from './greenhouse-questions.js'
import { pageSignals } from './page-signals.js'
import { checklistRows } from './checklist.js'
import { moveTo } from './session-state.js'
import { pushView } from './session-view.js'
import { restartCast } from './session-attach.js'

// Reads the page the session is on: every field with its verdict, what step
// the page is (see page-signals.js), and the checklist. Values the person
// types are picked up on the next read, which is how "needs you" turns into
// "done" as they answer.
export async function scanPage(s) {
  const page = await s.world.evaluate(READ_PAGE)
  const fields = withQuestions(page.fields, await s.questions)
  const verdicts = fields.map((field) => classify(field, s.ats))
  s.scan = { ...page, fields }
  s.verdicts = verdicts
  s.pageUrl = page.url
  s.title = page.title
  s.signals = pageSignals(s.scan, verdicts)
  s.submit = s.signals.submit
  s.rows = checklistRows({ fields, verdicts, results: s.results })
  return s.signals
}

// What a read means for who holds the wheel. A wall always goes to the
// person, whatever was happening; a confirmation page ends the application.
// Nothing here moves the wheel back to JobDekho.
export function heed(s, signals) {
  if (s.closing || s.state === 'starting' || s.state === 'filling') return
  if (signals.wall && s.reason !== signals.wall) moveTo(s, 'yours', signals.wall)
  else if (signals.submitted && s.reason !== 'submitted') moveTo(s, 'review', 'submitted')
}

// Reads soon, once: presses and navigations come in bursts, and one read
// after the burst settles is all the checklist needs.
export function scheduleScan(s, ms = 900) {
  clearTimeout(s.timers.scan)
  s.timers.scan = setTimeout(async () => {
    if (s.closing || s.state === 'filling') return
    try {
      heed(s, await scanPage(s))
      pushView(s)
    } catch {
      // A read during a navigation fails; the navigation schedules another.
    }
  }, ms)
  s.timers.scan.unref?.()
}

// A new document: ids from the old one mean nothing now, the picture has to
// be restarted on the new renderer, and the page is read once it settles.
export function onNavigated(s) {
  s.results = new Map()
  s.picker = null
  s.world?.reset()
  clearTimeout(s.timers.cast)
  s.timers.cast = setTimeout(() => {
    if (!s.closing) restartCast(s).catch(() => {})
  }, 150)
  s.timers.cast.unref?.()
  scheduleScan(s, 1200)
}
