import { SUBMIT_BUTTON, AUTH_BUTTON } from './sensitive-patterns.js'

// What step of an application the page in front of the person is, read from
// its fields, buttons, frames and words. A wall (a sign-in, a new account, a
// code, a human check) hands the window to the person before JobDekho fills
// anything; a closed posting and a confirmation page end the filling; a
// submit button on the page makes it the final review.
//
// A captcha script alone is not a wall: Greenhouse, Lever and Ashby load an
// invisible one on every form and only ask at submit. A wall is a challenge
// actually showing, or a vendor that covers the whole page (DataDome did,
// before a single field, on SmartRecruiters).
const CHALLENGE_FRAMES = /(recaptcha\/api2\/bframe|hcaptcha\.com\/.*frame=challenge|challenges\.cloudflare\.com|captcha-delivery\.com|arkoselabs|funcaptcha|geetest|perimeterx)/i
const CHALLENGE_WORDS = /\b(verify you are (a )?human|are you a robot|i'?m not a robot|press (&|and) hold|complete the (security )?check|checking your browser)\b/i
const CLOSED_WORDS = /\b(no longer (accepting applications|available|open)|position (has been )?filled|job (is )?(closed|not found)|page not found|page you (requested|are looking for) (was not found|doesn'?t exist))\b/i
const DONE_WORDS = /\b(thank you for (applying|your application)|application (has been )?(submitted|received)|we('ve| have) received your application)\b/i
const REGISTER = /\b(create (an )?account|register|sign ?up|confirm (your )?password)\b/i

function wallOf(page, verdicts) {
  const shown = (i) => page.fields[i].visible
  const kinds = verdicts.map((v, i) => (shown(i) && v.kind === 'personal' ? v.category : null))
  const challenge = page.frames.some((f) => CHALLENGE_FRAMES.test(f.src) && (f.w > 80 || /captcha-delivery/i.test(f.src)))
  if (challenge || CHALLENGE_WORDS.test(page.text)) return 'human-check'
  const passwords = kinds.filter((k) => k === 'password').length
  if (passwords > 1 || (passwords === 1 && REGISTER.test(`${page.url} ${page.text}`))) return 'account'
  if (passwords === 1) return 'sign-in'
  if (kinds.includes('code')) return 'code'
  // Two-step sign-ins ask for an email first, with no password on the page:
  // an auth button and nothing else JobDekho could fill.
  const fillable = verdicts.filter((v, i) => shown(i) && (v.kind === 'slot' || v.kind === 'file')).length
  const auth = page.buttons.some((b) => AUTH_BUTTON.test(b.text))
  if (auth && fillable <= 1 && /\b(sign ?in|log ?in)\b/i.test(page.text)) return 'sign-in'
  return null
}

export function pageSignals(page, verdicts) {
  const visibleFields = page.fields.filter((f) => f.visible).length
  const submit = page.buttons.find((b) => SUBMIT_BUTTON.test(b.text) && !AUTH_BUTTON.test(b.text)) ?? null
  return {
    wall: wallOf(page, verdicts),
    closed: visibleFields === 0 && CLOSED_WORDS.test(`${page.title} ${page.text}`),
    submitted: DONE_WORDS.test(page.text) && visibleFields < 3,
    submit: submit ? submit.rect : null,
  }
}
