import { senderOf, isNoReply } from './senders.js'

// What a job mail says happened, by its words: the first rule a scan reads
// with (a model and the person's AI follow for what this leaves, see the
// spec). Precision first, as with posting tags: a kind is only 'sure' with a
// clear cue and clear job context; anything less is 'unsure' and is left out
// until something more certain reads it.
//
// The order decides a mail that says two things: "thanks for applying,
// please take this test" is a test. An offer or a rejection in the body
// outranks the subject ("Your interview at Globex", then "unfortunately we
// will not move forward"). The body's own cues for a test or an interview
// are stricter than the subject's: "we will contact you for an interview if
// shortlisted" sits in many a mail that only says it was received.
const ORDER = ['offer', 'rejected', 'interview', 'assessment', 'applied']

const OFFER = /offer letter|pleased to (extend|offer)|(happy|delighted|excited|thrilled) to (extend|offer)|offer of employment|\bjob offer\b|congratulations[^.]{0,80}\boffer\b/
// "Unfortunately" alone is not a rejection ("unfortunately we must
// reschedule"); these say the person is out.
const REJECTED = /regret to inform|not (to )?(move|moving|proceed|proceeding|progress|progressing) (forward |further )?with your (application|candidature|candidacy)|(move|moving|proceed|go) forward with (other|another) candidates?|other candidates (whose|who)|not been (selected|shortlisted)|(were|was) not selected|position has (now )?been filled|(won'?t|will not) be (moving|progressing|taking) (forward|your application)|decided not to (move|proceed|progress)|no longer (being )?considered/
const APPLIED = /thank(s| you) for (applying|your application)|application (has been |was |is )?(received|submitted|sent|complete)|(we('| ha)ve|have) received your application|your application (to|for|at|with|has|was)|application (confirmation|acknowledg)|successfully applied|you('ve| have)? applied|thank(s| you) for (your )?interest(ed)? in/

const SUBJECT = {
  offer: OFFER,
  rejected: REJECTED,
  interview: /\binterviews?\b|\b(technical|hr|managerial|final|first|second|third|1st|2nd|3rd) round\b|\bround (1|2|3|one|two|three)\b|^invitation: /,
  assessment: /\bassessment\b|coding (test|challenge|round|exercise|assignment)|online test|take.home|aptitude test|test link|\bhackerrank\b|\bhackerearth\b|\bcodility\b|\bmettl\b|\bcodesignal\b/,
  applied: APPLIED,
}

const BODY = {
  offer: OFFER,
  rejected: REJECTED,
  interview: /invit(e|ed|ing) you (to|for) (an? |the |your )?(\w+ )?interview|schedul(e|ed|ing) (an? |the |your )(\w+ )?interview|interview (is |has been )?(scheduled|confirmed)|your interview (on|at|with|is)|interview invitation|shortlisted for (the |an? )?(\w+ )?interview/,
  assessment: /complete (the|an|your|this) (online |coding |technical )?(assessment|test|challenge|assignment)|(assessment|test) link|invited to (take|complete|attempt)|take.home (assignment|exercise|task)/,
  applied: APPLIED,
}

const JOB = /\b(jobs?|roles?|positions?|openings?|vacanc(y|ies)|intern(ship)?s?|engineers?|developers?|analysts?|candidates?|candidature|candidacy|recruit(er|ers|ing|ment)|hiring|talent|careers?|resume|cv|interviews?|sde|swe)\b/

const cueOf = (text, cues) => ORDER.find((kind) => cues[kind].test(text)) ?? null

function kindOf(subject, body) {
  if (OFFER.test(body)) return 'offer'
  if (REJECTED.test(body)) return 'rejected'
  return cueOf(subject, SUBJECT) ?? cueOf(body, BODY)
}

// { kind, sure, sender, byYou? } or null for a mail with no kind at all.
// `inThread` says the person wrote in this mail's thread, so a person
// answering in it is a reply even with no cue word.
export function readKind(mail, { inThread = false } = {}) {
  const sender = senderOf(mail.from.address)
  const subject = mail.subject.toLowerCase()
  const body = mail.text.slice(0, 1500).toLowerCase()
  const fromHiring = sender.kind === 'ats' || sender.kind === 'test'
  if (!(fromHiring || JOB.test(subject) || JOB.test(body.slice(0, 600)))) return null
  if (mail.mine) {
    const applying = APPLIED.test(subject) || /\b(application|applying) for\b/.test(subject)
    return applying ? { kind: 'applied', sure: true, sender, byYou: true } : null
  }
  const kind = sender.kind === 'test' && !OFFER.test(body) && !REJECTED.test(body) ? 'assessment' : kindOf(subject, body)
  if (!kind) {
    const human = !isNoReply(mail.from.address) && sender.kind !== 'board'
    return inThread && human ? { kind: 'replied', sure: true, sender } : null
  }
  // Boards send their own news and tips; from them only an application they
  // confirm is taken as sure.
  const sure = sender.kind === 'board' ? kind === 'applied' : fromHiring || cueOf(subject, SUBJECT) === kind || JOB.test(subject)
  return { kind, sure, sender }
}
