// Mail Gmail's search finds that is plainly not about an application,
// dropped on its subject alone, before its body is downloaded: the boards'
// "jobs for you" alerts and digests, newsletters, account and payment mail.
// A job alert is the commonest by far, and none of it says the person
// applied anywhere. Anything not plainly noise goes on to be read.
const NOISE = new RegExp([
  'jobs? (for|matching|that match|you might|you may)', 'recommended (jobs|for you)', 'job alerts?', '\\bnew jobs?\\b', 'jobs? you may',
  '\\b(is|are|we\'re|we are) hiring\\b', 'hiring now', 'top (jobs|companies)', 'job opportunities for you', '\\bdigest\\b', 'newsletter',
  'webinar', 'profile (views?|viewed|visits?)', 'who viewed', '(complete|update|improve) your profile', 'verify your (email|account)',
  '\\botp\\b', 'one.time password', '(reset|change) your password', '\\binvoice\\b', 'order (confirmed|confirmation|#)', '\\breceipt\\b',
  'payment (received|successful|failed)', 'credit card', 'loan application', 'visa application', 'passport', 'admission',
  'scholarship', 'leave application', 'refund',
].join('|'), 'i')

export const worthReading = (mail) => !NOISE.test(mail.subject)
