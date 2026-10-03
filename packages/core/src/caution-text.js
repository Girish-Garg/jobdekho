// What Caution reads of a description: everything except the company's own
// warnings. Employers' anti-fraud notices use exactly the words a red flag
// is made of ("we never ask for a registration fee", "fraudsters may ask
// you to pay"), and reading them flagged the honest employer.
const NOTICE = /\b(?:fraud\w*|scam\w*|fake|beware|disclaimer|impersonat\w*|phishing|unsolicited|not (?:from|associated with|affiliated with|authori[sz]ed by) us|recruitment agenc\w*|never (?:ask|charge|request|demand|seek)s?|(?:does|do|will) not (?:ask|charge|request|demand|seek|collect)|not responsible for any fees?)\b/i

// A notice runs to the end of its paragraph; one that is only a heading
// ("Fraud alert") covers the paragraph under it too.
export function withoutNotices(text) {
  const out = []
  let notice = 0
  for (const line of String(text || '').split('\n')) {
    if (!line.trim()) {
      notice = Math.max(0, notice - 1)
      out.push(line)
      continue
    }
    if (NOTICE.test(line)) notice = line.trim().length < 40 ? 2 : 1
    if (!notice) out.push(line)
  }
  return out.join('\n')
}

// "no registration fee", "we do not charge any fee", "without any charges":
// the clause says the opposite of its words.
const NEG_BEFORE = /\b(?:no|not|never|without|free of|zero|nil|waived?|don['’]?t|doesn['’]?t|won['’]?t)\b[^.;!?\n]{0,40}$/i
// "Registration fee: Nil", "fee is waived", "borne by the company".
const NEG_AFTER = /^\s*(?:[:\-\u2013]\s*)?(?:is\s+|are\s+|of\s+)?(?:nil|none|free|waived|zero|not (?:required|applicable)|n\/a|(?:rs\.?|inr|₹)\s*0\b|0\b|(?:borne|paid|covered|reimbursed) by (?:the |our )?(?:company|employer|us))/i

export function negated(text, index, length) {
  const before = text.slice(Math.max(0, index - 60), index).split(/[.;!?\n]/).pop()
  return NEG_BEFORE.test(before) || NEG_AFTER.test(text.slice(index + length, index + length + 40))
}
