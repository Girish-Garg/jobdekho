// A bot check answering in a page's place: Cloudflare's "Just a moment..."
// (and its cf-mitigated header), an AWS WAF action, a CAPTCHA. JobDekho never
// works past one; seeing one is a plain no.
const WORDS = /Just a moment\.\.\.|challenge-platform|cf-chl|awswaf|captcha/i

export function isChallenge(res, text = '') {
  const header = (name) => res?.headers?.get?.(name)
  if (header('cf-mitigated') || header('x-amzn-waf-action')) return true
  return Number(res?.status) >= 400 && WORDS.test(String(text).slice(0, 6000))
}
