import { classify } from './field-classify.js'
import { describeExpression } from './page/read.js'

// The last word before JobDekho touches a field, read fresh from the page:
// the wheel is still JobDekho's, the field is still there, it is still the
// thing the plan took it for, and it is still empty. Anything else and the
// field is left alone: a field that turned personal is never touched, and one
// filled in the meantime (by the site's own resume reader, or by the person)
// keeps what it holds. Null means go ahead.
export async function guard(ctx, step) {
  if (!ctx.canAct()) return 'stopped'
  const live = await ctx.world.evaluate(describeExpression(step.fid))
  if (!live) return 'gone'
  const verdict = classify(live, ctx.ats)
  if (verdict.kind === 'personal') return 'refused'
  const same = step.action === 'file' ? verdict.kind === 'file' : verdict.kind === 'slot' && verdict.slot === step.slot
  if (!same) return 'changed'
  if (live.hasValue) return 'kept'
  return null
}
