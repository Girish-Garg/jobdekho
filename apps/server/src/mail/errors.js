// What went wrong with Gmail, in a sentence the person can act on. Read from
// nodemailer's error: `code` for its own failures, `responseCode` and
// `response` for what Gmail's server answered. Never the password: none of
// these fields carries it.
const NO_REACH = new Set(['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'EDNS', 'ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET'])

const said = (err) => String(err?.response ?? '').replace(/\s+/g, ' ').slice(0, 160)

export function mailSentence(err, to = '') {
  const reply = said(err)
  if (/application-specific password/i.test(reply)) {
    return 'Gmail wants an app password here, not your Google password. Create one at myaccount.google.com/apppasswords and paste that.'
  }
  if (err?.code === 'EAUTH' || err?.responseCode === 535 || err?.responseCode === 534) {
    return 'Gmail did not accept this address and app password. Check both: the app password is the 16 letters Google showed once, and your account needs 2-Step Verification on.'
  }
  if (NO_REACH.has(err?.code)) return 'JobDekho could not reach Gmail. Check your internet connection and try again.'
  if (/5\.4\.5|sending limit/i.test(reply)) return 'Gmail says your account has sent as many mails as it allows for today. Try again tomorrow.'
  if (err?.code === 'EENVELOPE' || err?.responseCode === 550 || err?.responseCode === 553) {
    return `Gmail would not send to ${to || 'that address'}${reply ? `: ${reply}` : '.'}`
  }
  return `Gmail did not take the mail${reply ? `: ${reply}` : '.'}`
}
