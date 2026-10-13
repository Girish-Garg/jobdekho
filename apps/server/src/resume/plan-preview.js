import { createHash } from 'node:crypto'
import { compileGuarded } from '../documents/pdf.js'
import { renderPlan } from './render-plan.js'
import { patched, patchedAll } from './plan-patch.js'

// The page a tailoring plan makes, compiled for the review screen before
// any document exists, and how much each cut on offer would save. Kept in
// memory and only the last few: every flip of a choice is another PDF, and
// the documents' cache on disk is never cleared (see resume/cache.js).
const KEPT = 40

// How many compiles run side by side while cuts are measured. Each is its
// own pdflatex in its own folder; three keeps a laptop usable meanwhile.
const AT_ONCE = 3

// `compile` and `measure` are the server's (resume/compile.js,
// resume/pdf-pages.js) or a test's.
export function createPlanPreviews({ compile, measure }) {
  const kept = new Map()

  // { pdf, length } for the plan as it stands, `length` null when the PDF
  // could not be measured; or { failure } as documents/pdf.js gives it.
  async function of(profile, plan) {
    const tex = renderPlan('classic', profile, plan)
    const key = createHash('sha256').update(tex).digest('hex')
    if (kept.has(key)) return kept.get(key)
    const made = await compileGuarded({ tex, compile })
    if (made.failure) return made
    const page = { pdf: made.pdf, length: await Promise.resolve(made.pdf).then(measure).catch(() => null) }
    kept.set(key, page)
    if (kept.size > KEPT) kept.delete(kept.keys().next().value)
    return page
  }

  const linesOf = async (profile, plan, choices) => (await of(profile, { ...plan, choices })).length?.lines ?? null

  // Each cut with the lines it saves, counted on the real page: the plan
  // with the cut made against the plan without it, whatever else is ticked.
  // `enough` says whether making every cut reaches one page; null when no
  // page could be measured.
  async function measured(profile, plan, cuts) {
    const now = plan.choices ?? {}
    // The page as it stands is one side of every comparison below.
    await of(profile, plan)
    const saves = []
    for (let at = 0; at < cuts.length; at += AT_ONCE) {
      saves.push(...await Promise.all(cuts.slice(at, at + AT_ONCE).map(async ({ patch }) => {
        const [made, not] = [await linesOf(profile, plan, patched(now, patch, true)), await linesOf(profile, plan, patched(now, patch, false))]
        return made === null || not === null ? null : Math.max(0, not - made)
      })))
    }
    const all = await of(profile, { ...plan, choices: patchedAll(now, cuts.map((cut) => cut.patch)) })
    return { cuts: cuts.map((cut, at) => ({ ...cut, saves: saves[at] })), enough: all.length ? all.length.pages <= 1 : null }
  }

  return { of, measured }
}
