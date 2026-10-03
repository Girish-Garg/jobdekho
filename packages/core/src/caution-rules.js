import { negated } from './caution-text.js'
import { sentenceAt } from './text-layout.js'
import { quote } from './tag.js'

// The red flags one posting's own text can show. Each states the fact it
// found, in words a person can check against the ad, and none says "scam".

// Asking the applicant for money: a fee of a named kind with an amount or a
// demand beside it, or "pay a fee". "Course fees" and "fee collection" are
// the work itself at an edtech or an accounts desk, so no kind, no flag; an
// exam's application fee is a government's, not an employer's.
const FEE = /\b(registration|training|joining|security|processing|onboarding|enrol+ment|certificat(?:e|ion)|kit|documentation|verification|interview|placement|refundable|non[- ]refundable|caution|uniform|laptop)\s+(fees?|deposit|charges?|amount)\b|\bpay\s+(?:an?\s+|the\s+)?(?:one[- ]time\s+|nominal\s+|small\s+|refundable\s+)?(fee|deposit|charge)\b/gi
const AMOUNT = /(?:₹|\brs\.?|\binr)\s*\d[\d,]*(?:\.\d+)?/i
const DEMAND = /\b(?:pay|paid|payable|deposit(?:ed)?|submit|transfer|remit|required|applicable|mandatory|charged)\b/i
// Handling other people's money: a property desk's tenants' deposits.
const OTHERS = /\b(?:collect\w*|reconcil\w*|invoic\w*|billing|tenants?|customers?|clients?|vendors?|refunds?)\b/i
const rupees = (amount) => amount.replace(/^(?:rs\.?|inr)\s*/i, '₹').replace(/\s+/g, '')

function fee(text) {
  for (const m of text.matchAll(FEE)) {
    if (negated(text, m.index, m[0].length)) continue
    const sentence = sentenceAt(text, m.index)
    const amount = AMOUNT.exec(sentence)?.[0]
    if ((!amount && !DEMAND.test(sentence)) || OTHERS.test(sentence)) continue
    const what = (m[1] ? `${m[1]} ${m[2]}` : m[3]).toLowerCase()
    return { code: 'fee', reason: `Asks applicants to pay a ${amount ? `${rupees(amount)} ` : ''}${what}`, evidence: quote(sentence, 120) }
  }
  return null
}

// A free mail address as the way to reach a company: a company hires from
// its own domain. Zoho is left out, being a company's own domain too.
const FREE_MAIL = /\b[\w.+-]+@(?:gmail|googlemail|yahoo|ymail|rocketmail|hotmail|outlook|live|msn|rediffmail|aol|icloud|proton(?:mail)?|gmx|yandex)\.(?:com|in|co\.in|co\.uk|me)\b/gi

function personalEmail(text) {
  for (const m of text.matchAll(FREE_MAIL)) {
    if (negated(text, m.index, m[0].length)) continue
    return { code: 'personal-email', reason: `Gives a personal email address (${m[0]}) as the contact`, evidence: quote(sentenceAt(text, m.index), 120) }
  }
  return null
}

// Pay stated only as "performance-based": no amount is promised, at most an
// "up to". Performance-based incentives or a PPO on top of real pay are not it.
const PERF = /\b(?:stipend|salary|pay|compensation|remuneration|ctc)\b[^.\n]{0,60}?\b(?:performance[- ]based|based on performance)\b|\b(?:performance[- ]based|based on performance)\s+(?:stipend|salary|pay|compensation|remuneration)\b/gi
const EXTRA = /^\s*(?:incentives?|bonus(?:es)?|commissions?|increments?|hikes?|appraisals?|rewards?|extension|conversion|ppo|pre-placement|full[- ]time|offer)/i
const FIXED = /(?<!up\s?to\s*|upto\s*|max(?:imum)?\s*(?:of\s*)?|as high as\s*)(?:₹|\brs\.?|\binr)\s*\d/i
const UP_TO = /\bup\s?to\s*(?:₹|rs\.?|inr)\s*\d[\d,]*/i
const upToPhrase = (sentence) => {
  const m = UP_TO.exec(sentence)?.[0]
  return m ? `, up to ${rupees(m.replace(/^up\s?to\s*/i, ''))}` : ''
}

function performancePay(text, stipend) {
  if (/^\s*performance[- ]based\s*$/i.test(String(stipend || ''))) {
    return { code: 'performance-pay', reason: 'Pay is stated only as performance-based', evidence: `Stipend: ${stipend}` }
  }
  for (const m of text.matchAll(PERF)) {
    if (EXTRA.test(text.slice(m.index + m[0].length))) continue
    const sentence = sentenceAt(text, m.index)
    if (FIXED.test(sentence)) continue
    return { code: 'performance-pay', reason: `Pay is only performance-based${upToPhrase(sentence)}`, evidence: quote(sentence, 120) }
  }
  return null
}

export const TEXT_FLAGS = [fee, personalEmail, performancePay]
